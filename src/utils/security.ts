import { PermissionKey, User, UserRole } from '../types';

const PBKDF2_ITERATIONS = 120000;
const PBKDF2_PREFIX = 'pbkdf2$sha256';
const SESSION_STORAGE_KEY = 'pos_auth_session_v2';
const LEGACY_SESSION_KEY = 'pos_active_session_user_id';
const LOCKOUT_STORAGE_KEY = 'pos_auth_lockout_v1';
const USERS_MAC_KEY = 'pos_users_integrity_mac_v1';
const KEYSTORE_DB_NAME = 'pos_security_keystore_v1';
const KEYSTORE_STORE_NAME = 'keys';

export const SESSION_MAX_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours max session
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle lock

export interface SignedSessionPayload {
  sid: string;
  userId: string;
  role: UserRole;
  issuedAt: number;
  expiresAt: number;
  lastActivityAt: number;
}

interface SignedEnvelope<T> {
  payload: T;
  sig: string;
}

interface LockoutEntry {
  attempts: number;
  lockedUntil: number;
  lastFailedAt: number;
}

type LockoutMap = Record<string, LockoutEntry>;

// In-memory fallbacks & cached non-extractable keys
let cachedAesKey: CryptoKey | null = null;
let cachedHmacKey: CryptoKey | null = null;
const memoryLockoutMap: LockoutMap = {};
let memorySessionFallback: SignedEnvelope<SignedSessionPayload> | null = null;

function assertWebCryptoAvailable(): SubtleCrypto {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is required for secure cryptographic operations.');
  }
  return window.crypto.subtle;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
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

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/* -------------------------------------------------------------------------- */
/*                       PBKDF2-SHA256 PIN / PASSWORD HASHING                 */
/* -------------------------------------------------------------------------- */

export function isHashedPin(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith(`${PBKDF2_PREFIX}$`);
}

export async function hashPin(plainPin: string): Promise<string> {
  const subtle = assertWebCryptoAvailable();
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(plainPin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashBytes = new Uint8Array(derivedBits);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hashBytes)}`;
}

export async function verifyPin(plainPin: string, storedHash: string): Promise<boolean> {
  if (!plainPin || !isHashedPin(storedHash)) {
    return false;
  }

  try {
    const subtle = assertWebCryptoAvailable();
    const parts = storedHash.split('$');
    // Expected: ['pbkdf2', 'sha256', '120000', '<salt>', '<hash>']
    if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') {
      return false;
    }

    const iterations = Number.parseInt(parts[2], 10);
    if (!Number.isFinite(iterations) || iterations < 100000) {
      return false;
    }

    const salt = base64ToBytes(parts[3]);
    const expectedHash = base64ToBytes(parts[4]);
    const encoder = new TextEncoder();

    const keyMaterial = await subtle.importKey(
      'raw',
      encoder.encode(plainPin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: toArrayBuffer(salt),
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      expectedHash.length * 8
    );

    return constantTimeEqual(new Uint8Array(derivedBits), expectedHash);
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*              NON-EXTRACTABLE KEYSTORE (INDEXEDDB WEB CRYPTO KEYS)          */
/* -------------------------------------------------------------------------- */

function openKeystoreDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(KEYSTORE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KEYSTORE_STORE_NAME)) {
        db.createObjectStore(KEYSTORE_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open keystore DB'));
  });
}

async function getStoredKey(id: string): Promise<CryptoKey | null> {
  try {
    const db = await openKeystoreDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(KEYSTORE_STORE_NAME, 'readonly');
      const store = tx.objectStore(KEYSTORE_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as CryptoKey) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function putStoredKey(id: string, key: CryptoKey): Promise<void> {
  try {
    const db = await openKeystoreDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(KEYSTORE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(KEYSTORE_STORE_NAME);
      store.put(key, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ephemeral fallback stays in memory
  }
}

export async function getOrCreateAesKey(): Promise<CryptoKey> {
  if (cachedAesKey) return cachedAesKey;
  const subtle = assertWebCryptoAvailable();

  const existing = await getStoredKey('device_aes_gcm_key');
  if (existing) {
    cachedAesKey = existing;
    return existing;
  }

  const key = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
  cachedAesKey = key;
  await putStoredKey('device_aes_gcm_key', key);
  return key;
}

export async function getOrCreateHmacKey(): Promise<CryptoKey> {
  if (cachedHmacKey) return cachedHmacKey;
  const subtle = assertWebCryptoAvailable();

  const existing = await getStoredKey('device_hmac_sha256_key');
  if (existing) {
    cachedHmacKey = existing;
    return existing;
  }

  const key = await subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false, // non-extractable
    ['sign', 'verify']
  );
  cachedHmacKey = key;
  await putStoredKey('device_hmac_sha256_key', key);
  return key;
}

/* -------------------------------------------------------------------------- */
/*                  AES-256-GCM LOCAL DATABASE ENCRYPTION                     */
/* -------------------------------------------------------------------------- */

const ENC_PREFIX = 'enc$v1$';

export function isEncryptedBlob(raw: string | null | undefined): boolean {
  return typeof raw === 'string' && raw.startsWith(ENC_PREFIX);
}

export async function encryptStringAesGcm(plaintext: string): Promise<string> {
  const subtle = assertWebCryptoAvailable();
  const key = await getOrCreateAesKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoded)
  );

  return `${ENC_PREFIX}${bytesToBase64(iv)}$${bytesToBase64(new Uint8Array(cipherBuffer))}`;
}

export async function decryptStringAesGcm(blob: string): Promise<string | null> {
  if (!isEncryptedBlob(blob)) return null;
  try {
    const subtle = assertWebCryptoAvailable();
    const key = await getOrCreateAesKey();
    const rest = blob.slice(ENC_PREFIX.length);
    const sepIdx = rest.indexOf('$');
    if (sepIdx === -1) return null;

    const iv = base64ToBytes(rest.slice(0, sepIdx));
    const cipherBytes = base64ToBytes(rest.slice(sepIdx + 1));

    const plainBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(cipherBytes)
    );

    return new TextDecoder().decode(plainBuffer);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                      HMAC SIGNING & INTEGRITY VERIFICATION                 */
/* -------------------------------------------------------------------------- */

async function signData(dataStr: string): Promise<string> {
  const subtle = assertWebCryptoAvailable();
  const key = await getOrCreateHmacKey();
  const sigBuf = await subtle.sign(
    'HMAC',
    key,
    toArrayBuffer(new TextEncoder().encode(dataStr))
  );
  return bytesToBase64(new Uint8Array(sigBuf));
}

async function verifySignature(dataStr: string, sigB64: string): Promise<boolean> {
  try {
    const subtle = assertWebCryptoAvailable();
    const key = await getOrCreateHmacKey();
    const sigBytes = base64ToBytes(sigB64);
    return await subtle.verify(
      'HMAC',
      key,
      toArrayBuffer(sigBytes),
      toArrayBuffer(new TextEncoder().encode(dataStr))
    );
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                 SIGNED SESSION TOKEN & IDLE TIMEOUT SECURITY               */
/* -------------------------------------------------------------------------- */

export async function createSignedSession(
  userId: string,
  role: UserRole
): Promise<SignedSessionPayload> {
  // Always clean legacy plaintext bypass key
  try {
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }

  const now = Date.now();
  const sidBytes = window.crypto.getRandomValues(new Uint8Array(16));
  const payload: SignedSessionPayload = {
    sid: bytesToBase64(sidBytes),
    userId,
    role,
    issuedAt: now,
    expiresAt: now + SESSION_MAX_TTL_MS,
    lastActivityAt: now,
  };

  const serialized = JSON.stringify(payload);
  const sig = await signData(serialized);
  const envelope: SignedEnvelope<SignedSessionPayload> = { payload, sig };

  memorySessionFallback = envelope;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // memorySessionFallback remains active
  }
  return payload;
}

export async function verifySignedSession(): Promise<{
  valid: boolean;
  session?: SignedSessionPayload;
  reason?: 'missing' | 'tampered' | 'expired' | 'idle_timeout';
}> {
  // Explicitly clear legacy unverified localStorage session ID if present
  try {
    if (localStorage.getItem(LEGACY_SESSION_KEY)) {
      localStorage.removeItem(LEGACY_SESSION_KEY);
    }
  } catch {
    // ignore
  }

  let rawEnvelope: string | null = null;
  try {
    rawEnvelope = sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    rawEnvelope = null;
  }

  let envelope: SignedEnvelope<SignedSessionPayload> | null = null;
  if (rawEnvelope) {
    try {
      envelope = JSON.parse(rawEnvelope) as SignedEnvelope<SignedSessionPayload>;
    } catch {
      return { valid: false, reason: 'tampered' };
    }
  } else if (memorySessionFallback) {
    envelope = memorySessionFallback;
  }

  if (!envelope || !envelope.payload || !envelope.sig) {
    return { valid: false, reason: 'missing' };
  }

  const serialized = JSON.stringify(envelope.payload);
  const isSigValid = await verifySignature(serialized, envelope.sig);
  if (!isSigValid) {
    await clearSignedSession();
    return { valid: false, reason: 'tampered' };
  }

  const now = Date.now();
  if (now > envelope.payload.expiresAt) {
    await clearSignedSession();
    return { valid: false, reason: 'expired' };
  }

  if (now - envelope.payload.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) {
    await clearSignedSession();
    return { valid: false, reason: 'idle_timeout' };
  }

  return { valid: true, session: envelope.payload };
}

export async function touchSignedSession(): Promise<boolean> {
  const verification = await verifySignedSession();
  if (!verification.valid || !verification.session) return false;

  const updatedPayload: SignedSessionPayload = {
    ...verification.session,
    lastActivityAt: Date.now(),
  };
  const sig = await signData(JSON.stringify(updatedPayload));
  const envelope: SignedEnvelope<SignedSessionPayload> = { payload: updatedPayload, sig };
  memorySessionFallback = envelope;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // ignore
  }
  return true;
}

export async function clearSignedSession(): Promise<void> {
  memorySessionFallback = null;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }
}

/* -------------------------------------------------------------------------- */
/*                     USERS DIRECTORY ROLE INTEGRITY MAC                     */
/* -------------------------------------------------------------------------- */

function canonicalUsersDigestInput(users: User[]): string {
  const minimal = users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    active: u.active,
    permissions: [...(u.permissions || [])].sort(),
  }));
  return JSON.stringify(minimal);
}

export async function signUsersDirectory(users: User[]): Promise<void> {
  try {
    const mac = await signData(canonicalUsersDigestInput(users));
    localStorage.setItem(USERS_MAC_KEY, mac);
  } catch {
    // ignore
  }
}

export async function verifyUsersDirectoryIntegrity(users: User[]): Promise<boolean> {
  try {
    const storedMac = localStorage.getItem(USERS_MAC_KEY);
    if (!storedMac) {
      // First-time upgrade bootstrap: sign current directory once
      await signUsersDirectory(users);
      return true;
    }
    return await verifySignature(canonicalUsersDigestInput(users), storedMac);
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                 BRUTE-FORCE RATE LIMITER (MEMORY + SIGNED STORAGE)         */
/* -------------------------------------------------------------------------- */

async function loadSignedLockouts(): Promise<LockoutMap> {
  try {
    const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return { ...memoryLockoutMap };
    const env = JSON.parse(raw) as SignedEnvelope<LockoutMap>;
    if (!env?.payload || !env?.sig) return { ...memoryLockoutMap };
    const ok = await verifySignature(JSON.stringify(env.payload), env.sig);
    if (!ok) {
      // Storage was tampered with; preserve in-memory counters and re-persist
      return { ...memoryLockoutMap };
    }
    // Merge whichever has stricter lockout
    const merged: LockoutMap = { ...env.payload };
    for (const [k, memEntry] of Object.entries(memoryLockoutMap)) {
      const storedEntry = merged[k];
      if (!storedEntry || memEntry.attempts > storedEntry.attempts || memEntry.lockedUntil > storedEntry.lockedUntil) {
        merged[k] = memEntry;
      }
    }
    return merged;
  } catch {
    return { ...memoryLockoutMap };
  }
}

async function saveSignedLockouts(map: LockoutMap): Promise<void> {
  Object.assign(memoryLockoutMap, map);
  try {
    const sig = await signData(JSON.stringify(map));
    localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify({ payload: map, sig }));
  } catch {
    // memoryLockoutMap stays intact
  }
}

function normalizeThrottleKey(identifier: string): string {
  return `id:${identifier.trim().toLowerCase() || '__unknown__'}`;
}

export async function checkLoginThrottle(identifier: string): Promise<{
  allowed: boolean;
  remainingSeconds: number;
  attempts: number;
}> {
  const map = await loadSignedLockouts();
  const key = normalizeThrottleKey(identifier);
  const terminalKey = '__terminal__';
  const now = Date.now();

  const idEntry = map[key];
  const termEntry = map[terminalKey];

  const maxLockedUntil = Math.max(idEntry?.lockedUntil || 0, termEntry?.lockedUntil || 0);
  const attempts = Math.max(idEntry?.attempts || 0, termEntry?.attempts || 0);

  if (maxLockedUntil > now) {
    return {
      allowed: false,
      remainingSeconds: Math.ceil((maxLockedUntil - now) / 1000),
      attempts,
    };
  }

  return { allowed: true, remainingSeconds: 0, attempts };
}

export async function recordFailedLoginAttempt(identifier: string): Promise<{
  attempts: number;
  lockedSeconds: number;
}> {
  const map = await loadSignedLockouts();
  const key = normalizeThrottleKey(identifier);
  const terminalKey = '__terminal__';
  const now = Date.now();

  const updateBucket = (bucketKey: string, multiplier = 1): LockoutEntry => {
    const prev = map[bucketKey] || { attempts: 0, lockedUntil: 0, lastFailedAt: 0 };
    // Reset attempt window after 15 minutes of inactivity
    const baseAttempts = now - prev.lastFailedAt > 15 * 60 * 1000 ? 0 : prev.attempts;
    const attempts = baseAttempts + 1;
    let lockoutMs = 0;

    if (attempts >= 10 * multiplier) {
      lockoutMs = 5 * 60 * 1000; // 5 minutes
    } else if (attempts >= 8 * multiplier) {
      lockoutMs = 2 * 60 * 1000; // 2 minutes
    } else if (attempts >= 5 * multiplier) {
      lockoutMs = 30 * 1000; // 30 seconds
    }

    return {
      attempts,
      lockedUntil: lockoutMs > 0 ? Math.max(prev.lockedUntil, now + lockoutMs) : prev.lockedUntil,
      lastFailedAt: now,
    };
  };

  map[key] = updateBucket(key, 1);
  map[terminalKey] = updateBucket(terminalKey, 2); // terminal cap at 10, 16, 20 global failures

  await saveSignedLockouts(map);

  const lockedUntil = Math.max(map[key].lockedUntil, map[terminalKey].lockedUntil);
  return {
    attempts: map[key].attempts,
    lockedSeconds: lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0,
  };
}

export async function clearLoginAttempts(identifier: string): Promise<void> {
  const map = await loadSignedLockouts();
  const key = normalizeThrottleKey(identifier);
  delete map[key];
  delete memoryLockoutMap[key];
  if (map['__terminal__']) {
    map['__terminal__'].attempts = 0;
    map['__terminal__'].lockedUntil = 0;
  }
  await saveSignedLockouts(map);
}

/* -------------------------------------------------------------------------- */
/*                  POSITIVE ROLE & PERMISSION ACCESS CONTROL                 */
/* -------------------------------------------------------------------------- */

export const ALL_PERMISSIONS: PermissionKey[] = [
  'pos_sale',
  'price_change',
  'discount_override',
  'invoice_cancel',
  'product_manage',
  'inventory_adjust',
  'supplier_manage',
  'customer_manage',
  'due_manage',
  'expense_manage',
  'reports_view',
  'user_manage',
  'settings_manage',
  'backup_manage',
];

export function getPermissionsForRole(role: UserRole): PermissionKey[] {
  switch (role) {
    case 'admin':
      return [...ALL_PERMISSIONS];
    case 'manager':
      return [
        'pos_sale',
        'price_change',
        'product_manage',
        'inventory_adjust',
        'supplier_manage',
        'customer_manage',
        'due_manage',
        'expense_manage',
        'reports_view',
      ];
    case 'stock_manager':
      return ['product_manage', 'inventory_adjust', 'supplier_manage'];
    case 'salesman':
    case 'cashier':
      return ['pos_sale', 'customer_manage', 'due_manage'];
    case 'visitor':
      return ['pos_sale', 'product_manage', 'customer_manage', 'due_manage'];
    default:
      return [];
  }
}

export function hasPermission(user: User | null | undefined, perm: PermissionKey): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(perm);
}

export const TAB_REQUIRED_PERMISSIONS: Record<string, PermissionKey | 'ADMIN_ONLY'> = {
  dashboard: 'pos_sale',
  pos: 'pos_sale',
  products: 'pos_sale', // readable catalog for terminal checkout; edits require product_manage
  inventory: 'pos_sale',
  customers: 'customer_manage',
  customer_due: 'due_manage',
  sales: 'pos_sale',
  returns: 'pos_sale',
  cash: 'pos_sale',
  purchases: 'supplier_manage',
  suppliers: 'supplier_manage',
  expenses: 'expense_manage',
  quotations: 'reports_view',
  reports: 'reports_view',
  users: 'user_manage',
  settings: 'settings_manage',
  backup: 'backup_manage',
  drive: 'backup_manage',
  audit: 'ADMIN_ONLY',
};

export function canAccessTab(user: User | null | undefined, tabId: string): boolean {
  if (!user || !user.active) return false;

  // Visitor account is explicitly blocked from sensitive administrative/financial tabs
  if (user.role === 'visitor') {
    const visitorBlocked = ['quotations', 'reports', 'users', 'settings', 'backup', 'audit', 'drive', 'purchases', 'suppliers', 'expenses'];
    if (visitorBlocked.includes(tabId)) return false;
  }

  const req = TAB_REQUIRED_PERMISSIONS[tabId];
  if (!req) return user.role === 'admin';
  if (req === 'ADMIN_ONLY') return user.role === 'admin';
  return hasPermission(user, req);
}
