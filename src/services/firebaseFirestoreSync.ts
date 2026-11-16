import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DatabaseBackup } from '../types';

// Reuse single Firebase app instance initialized with applet config
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestoreAuth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const BOOTSTRAP_OWNER_EMAIL = 'raihan334455@gmail.com';
const FIRESTORE_ENC_PREFIX = 'fsenc$v1$';
const MAX_ENCRYPTED_SNAPSHOT_LEN = 495000;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firestoreAuth.currentUser?.uid,
      email: firestoreAuth.currentUser?.email,
      emailVerified: firestoreAuth.currentUser?.emailVerified,
      isAnonymous: firestoreAuth.currentUser?.isAnonymous,
      tenantId: firestoreAuth.currentUser?.tenantId,
      providerInfo:
        firestoreAuth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore cleanly without crashing offline workflows
let connectionTested = false;
export async function testFirestoreConnection(): Promise<{ online: boolean; error?: string }> {
  if (connectionTested) return { online: true };
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { online: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.warn('Firestore operating offline; local vault remains active.');
      return { online: false, error: 'Offline mode active' };
    }
    // Permission error on test/connection is expected when rules default-deny unknown collections
    return { online: true };
  }
}

export interface CloudStoreRecord {
  id: string;
  ownerId: string;
  storeName: string;
  encryptedSnapshot?: string;
  createdAt?: string;
  updatedAt?: string;
}

const sanitizeDocId = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
  return cleaned || 'store_default';
};

export function getStoreCloudDocId(user: FirebaseUser, branchId?: string): string {
  const branchClean = sanitizeDocId(branchId || 'main');
  return sanitizeDocId(`store_${user.uid.slice(0, 28)}_${branchClean}`);
}

export async function signInWithGoogleForFirestore(): Promise<FirebaseUser | null> {
  if (firestoreAuth.currentUser && firestoreAuth.currentUser.emailVerified) {
    return firestoreAuth.currentUser;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(firestoreAuth, provider);
    if (!result.user.emailVerified) {
      throw new Error('Verified Google email account is required for Firestore cloud sync.');
    }
    return result.user;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error(
        'Sign-in popup was blocked by browser. Please allow popups and try again.'
      );
    }
    throw error;
  }
}

// Bootstrap admin membership record when signed in as the verified owner email
export async function ensureAdminRecordIfOwner(user: FirebaseUser): Promise<void> {
  if (!user.emailVerified || user.email !== BOOTSTRAP_OWNER_EMAIL) return;
  const adminId = sanitizeDocId(user.uid);
  const path = `admins/${adminId}`;
  try {
    const ref = doc(db, 'admins', adminId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: adminId,
        email: user.email,
        role: 'admin',
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    // Non-blocking diagnostic only
    console.warn('Bootstrap admin check:', err instanceof Error ? err.message : err);
    void path;
  }
}

/* -------------------------------------------------------------------------- */
/*          PORTABLE ACCOUNT-SCOPED AES-256-GCM CLOUD PAYLOAD CRYPTO          */
/* -------------------------------------------------------------------------- */

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function deriveAccountCloudKey(ownerId: string, storeId: string): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API is required for encrypted cloud sync.');
  }
  const subtle = window.crypto.subtle;
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(`SuperStoreCloudVault:${ownerId}:${firebaseConfig.projectId}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`store_salt:${storeId}`),
      iterations: 60000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptCloudSnapshot(
  plaintext: string,
  ownerId: string,
  storeId: string
): Promise<string> {
  const subtle = window.crypto.subtle;
  const key = await deriveAccountCloudKey(ownerId, storeId);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuf = await subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoded)
  );
  return `${FIRESTORE_ENC_PREFIX}${bytesToBase64(iv)}$${bytesToBase64(new Uint8Array(cipherBuf))}`;
}

async function decryptCloudSnapshot(
  blob: string,
  ownerId: string,
  storeId: string
): Promise<string> {
  if (!blob.startsWith(FIRESTORE_ENC_PREFIX)) {
    throw new Error('Unsupported or invalid cloud snapshot format.');
  }
  const rest = blob.slice(FIRESTORE_ENC_PREFIX.length);
  const sep = rest.indexOf('$');
  if (sep === -1) {
    throw new Error('Corrupted cloud snapshot envelope.');
  }
  const iv = base64ToBytes(rest.slice(0, sep));
  const cipherBytes = base64ToBytes(rest.slice(sep + 1));
  const key = await deriveAccountCloudKey(ownerId, storeId);

  const plainBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(cipherBytes)
  );
  return new TextDecoder().decode(plainBuf);
}

// Strip oversized inline data-URI images only if cloud payload nears 500k Firestore string cap
function prepareCompactBackupForCloud(backup: DatabaseBackup): {
  payload: DatabaseBackup;
  strippedInlineImages: boolean;
} {
  const fullJson = JSON.stringify(backup);
  if (fullJson.length <= 330000) {
    return { payload: backup, strippedInlineImages: false };
  }

  const trimmedCopy: DatabaseBackup = {
    ...backup,
    store: {
      ...backup.store,
      store_logo:
        backup.store.store_logo && backup.store.store_logo.startsWith('data:image/')
          ? undefined
          : backup.store.store_logo,
      seller_signature:
        backup.store.seller_signature && backup.store.seller_signature.startsWith('data:image/')
          ? undefined
          : backup.store.seller_signature,
    },
    products: (backup.products || []).map((p) => ({
      ...p,
      image: p.image && p.image.startsWith('data:image/') ? undefined : p.image,
    })),
  };

  return { payload: trimmedCopy, strippedInlineImages: true };
}

function formatFirestoreTimestamp(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as any).toDate === 'function') {
    return (val as any).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return undefined;
}

/* -------------------------------------------------------------------------- */
/*                       FIRESTORE SYNC & RESTORE OPERATIONS                  */
/* -------------------------------------------------------------------------- */

export async function getCloudStoreMetadata(
  user: FirebaseUser,
  branchId?: string
): Promise<CloudStoreRecord | null> {
  const storeId = getStoreCloudDocId(user, branchId);
  const path = `stores/${storeId}`;
  try {
    const snap = await getDoc(doc(db, 'stores', storeId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      ownerId: data.ownerId,
      storeName: data.storeName,
      encryptedSnapshot: data.encryptedSnapshot,
      createdAt: formatFirestoreTimestamp(data.createdAt),
      updatedAt: formatFirestoreTimestamp(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function listOwnerCloudStores(user: FirebaseUser): Promise<CloudStoreRecord[]> {
  const path = 'stores';
  try {
    const q = query(collection(db, 'stores'), where('ownerId', '==', user.uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ownerId: data.ownerId,
        storeName: data.storeName,
        encryptedSnapshot: data.encryptedSnapshot,
        createdAt: formatFirestoreTimestamp(data.createdAt),
        updatedAt: formatFirestoreTimestamp(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeOwnerCloudStores(
  user: FirebaseUser,
  onChange: (records: CloudStoreRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'stores';
  const q = query(collection(db, 'stores'), where('ownerId', '==', user.uid));
  return onSnapshot(
    q,
    (snap) => {
      const rows: CloudStoreRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: data.ownerId,
          storeName: data.storeName,
          encryptedSnapshot: data.encryptedSnapshot,
          createdAt: formatFirestoreTimestamp(data.createdAt),
          updatedAt: formatFirestoreTimestamp(data.updatedAt),
        };
      });
      onChange(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function syncBackupToFirestore(
  user: FirebaseUser,
  backup: DatabaseBackup
): Promise<{
  storeId: string;
  action: 'created' | 'updated';
  syncedAt: string;
  bytesLength: number;
  strippedInlineImages: boolean;
}> {
  if (!user.emailVerified) {
    throw new Error('A verified Google account is required to sync to Firebase Firestore.');
  }

  await ensureAdminRecordIfOwner(user);

  const storeId = getStoreCloudDocId(user, backup.store?.branch_id);
  const path = `stores/${storeId}`;
  const docRef = doc(db, 'stores', storeId);

  const storeName = (backup.store?.store_name || 'SuperStore POS').trim().slice(0, 160) || 'SuperStore POS';
  const { payload: compactBackup, strippedInlineImages } = prepareCompactBackupForCloud(backup);
  const encryptedSnapshot = await encryptCloudSnapshot(
    JSON.stringify(compactBackup),
    user.uid,
    storeId
  );

  if (encryptedSnapshot.length > MAX_ENCRYPTED_SNAPSHOT_LEN) {
    throw new Error(
      `Store snapshot size (${Math.round(encryptedSnapshot.length / 1024)} KB) exceeds Firestore single-document limit (495 KB). Export offline JSON or Google Drive backup for full archive.`
    );
  }

  let existingExists = false;
  try {
    const existingSnap = await getDoc(docRef);
    existingExists = existingSnap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  if (existingExists) {
    try {
      await updateDoc(docRef, {
        storeName,
        encryptedSnapshot,
        updatedAt: serverTimestamp(),
      });
      return {
        storeId,
        action: 'updated',
        syncedAt: new Date().toISOString(),
        bytesLength: encryptedSnapshot.length,
        strippedInlineImages,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(docRef, {
        ownerId: user.uid,
        storeName,
        encryptedSnapshot,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        storeId,
        action: 'created',
        syncedAt: new Date().toISOString(),
        bytesLength: encryptedSnapshot.length,
        strippedInlineImages,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }
}

export async function restoreBackupFromFirestore(
  user: FirebaseUser,
  storeId: string
): Promise<DatabaseBackup> {
  const cleanId = sanitizeDocId(storeId);
  const path = `stores/${cleanId}`;
  try {
    const snap = await getDoc(doc(db, 'stores', cleanId));
    if (!snap.exists()) {
      throw new Error('No cloud snapshot found for this store ID.');
    }
    const data = snap.data();
    if (!data?.encryptedSnapshot || typeof data.encryptedSnapshot !== 'string') {
      throw new Error('Cloud store document does not contain a backup snapshot.');
    }

    const decryptedJson = await decryptCloudSnapshot(
      data.encryptedSnapshot,
      data.ownerId || user.uid,
      cleanId
    );
    const parsed = JSON.parse(decryptedJson) as DatabaseBackup;
    if (!parsed?.store || !Array.isArray(parsed?.products)) {
      throw new Error('Decrypted cloud snapshot failed validation check.');
    }
    return parsed;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('{')) {
      throw err;
    }
    if (err instanceof Error && (err.message.includes('No cloud') || err.message.includes('Decrypted') || err.message.includes('Unsupported'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function deleteCloudStoreBackup(storeId: string): Promise<void> {
  const cleanId = sanitizeDocId(storeId);
  const path = `stores/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'stores', cleanId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
