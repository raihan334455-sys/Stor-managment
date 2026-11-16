import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  LogOut,
  Loader2,
  Database,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DBStorage } from '../../db/storage';
import {
  CloudStoreRecord,
  firestoreAuth,
  getStoreCloudDocId,
  restoreBackupFromFirestore,
  signInWithGoogleForFirestore,
  subscribeOwnerCloudStores,
  syncBackupToFirestore,
} from '../../services/firebaseFirestoreSync';

interface FirestoreSyncCardProps {
  compact?: boolean;
  onSyncSuccess?: (message: string) => void;
}

export const FirestoreSyncCard: React.FC<FirestoreSyncCardProps> = ({
  compact = false,
  onSyncSuccess,
}) => {
  const { store, updateStore, refreshData, addAuditLog } = useApp();
  const isBn = store.language === 'bn';

  const [fbUser, setFbUser] = useState<FirebaseUser | null>(firestoreAuth.currentUser);
  const [cloudStores, setCloudStores] = useState<CloudStoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [confirmRestoreRecord, setConfirmRestoreRecord] = useState<CloudStoreRecord | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(firestoreAuth, (user) => {
      setFbUser(user && user.emailVerified ? user : null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!fbUser) {
      setCloudStores([]);
      return;
    }
    const unsub = subscribeOwnerCloudStores(
      fbUser,
      (records) => {
        setCloudStores(records);
      },
      (err) => {
        setStatusMsg({
          type: 'error',
          text: `Firestore read warning: ${err.message}`,
        });
      }
    );
    return () => unsub();
  }, [fbUser]);

  const currentDocId = fbUser ? getStoreCloudDocId(fbUser, store.branch_id) : '';
  const currentCloudDoc = cloudStores.find((c) => c.id === currentDocId) || cloudStores[0] || null;

  const handleGoogleConnect = async () => {
    setStatusMsg(null);
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogleForFirestore();
      if (user) {
        setFbUser(user);
        setStatusMsg({
          type: 'success',
          text: isBn
            ? `Firestore ক্লাউড অ্যাকাউন্ট সংযুক্ত হয়েছে (${user.email})`
            : `Connected to Firebase Firestore as ${user.email}`,
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Google Sign-In failed.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const executeUploadSync = async () => {
    if (!fbUser) return;
    setConfirmOverwrite(false);
    setStatusMsg(null);
    setIsLoading(true);
    try {
      const backup = DBStorage.exportFullBackup();
      const res = await syncBackupToFirestore(fbUser, backup);
      updateStore({
        ...store,
        last_firestore_sync_at: res.syncedAt,
        updated_at: res.syncedAt,
      });
      addAuditLog(
        'FIRESTORE_SYNC_UPLOAD',
        'Backup',
        `Synced encrypted snapshot to Firebase Firestore (${res.storeId}, ${Math.round(res.bytesLength / 1024)} KB)`
      );
      const msg = isBn
        ? `Firebase Firestore-এ ডেটা সফলভাবে সিঙ্ক হয়েছে (${Math.round(res.bytesLength / 1024)} KB)${res.strippedInlineImages ? ' · বড় ছবি ছাড়া কম্প্যাক্ট কপি' : ''}`
        : `Encrypted backup ${res.action === 'updated' ? 'updated' : 'saved'} in Firebase Firestore (${Math.round(res.bytesLength / 1024)} KB)${res.strippedInlineImages ? ' · compact copy' : ''}`;
      setStatusMsg({ type: 'success', text: msg });
      if (onSyncSuccess) onSyncSuccess(msg);
    } catch (err: any) {
      let errText = err?.message || 'Firestore sync failed.';
      if (errText.startsWith('{')) {
        try {
          const parsed = JSON.parse(errText);
          errText = parsed.error || errText;
        } catch {
          // keep raw
        }
      }
      setStatusMsg({ type: 'error', text: errText });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncClick = () => {
    if (currentCloudDoc) {
      setConfirmOverwrite(true);
    } else {
      void executeUploadSync();
    }
  };

  const executeRestore = async (record: CloudStoreRecord) => {
    if (!fbUser) return;
    setConfirmRestoreRecord(null);
    setStatusMsg(null);
    setIsLoading(true);
    try {
      const restored = await restoreBackupFromFirestore(fbUser, record.id);
      const ok = DBStorage.restoreFullBackup(restored);
      if (!ok) throw new Error('Local database restore failed.');
      refreshData();
      addAuditLog(
        'FIRESTORE_SYNC_RESTORE',
        'Backup',
        `Restored local store database from Firebase Firestore (${record.storeName})`
      );
      const msg = isBn
        ? `Firestore থেকে ডেটা রিস্টোর সম্পন্ন হয়েছে (${restored.products?.length || 0} টি পণ্য, ${restored.sales?.length || 0} টি বিক্রয়)।`
        : `Restored from Firebase Firestore (${restored.products?.length || 0} products, ${restored.sales?.length || 0} sales).`;
      setStatusMsg({ type: 'success', text: msg });
      if (onSyncSuccess) onSyncSuccess(msg);
    } catch (err: any) {
      let errText = err?.message || 'Restore failed.';
      if (errText.startsWith('{')) {
        try {
          const parsed = JSON.parse(errText);
          errText = parsed.error || errText;
        } catch {
          // keep raw
        }
      }
      setStatusMsg({ type: 'error', text: errText });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl ${
        compact ? 'p-4' : 'p-5'
      } space-y-4`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">
                {isBn ? 'Firebase Firestore ক্লাউড সিঙ্ক' : 'Firebase Firestore Cloud Sync'}
              </h3>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                  fbUser
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {fbUser ? fbUser.email : isBn ? 'সংযুক্ত নয়' : 'Not Connected'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBn
                ? 'অফলাইন ডেটা অক্ষত রেখে এনক্রিপ্টেড ব্যাকআপ ক্লাউডে সিঙ্ক ও রিস্টোর করুন।'
                : 'Real-time encrypted cloud backup & multi-device restore alongside offline storage.'}
            </p>
            {(currentCloudDoc?.updatedAt || store.last_firestore_sync_at) && (
              <p className="text-[11px] font-mono text-indigo-600 mt-1">
                {isBn ? 'সর্বশেষ সিঙ্ক:' : 'Last Firestore Sync:'}{' '}
                {new Date(
                  currentCloudDoc?.updatedAt || store.last_firestore_sync_at || ''
                ).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!fbUser ? (
            <button
              type="button"
              disabled={isSigningIn}
              onClick={handleGoogleConnect}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors min-h-[40px]"
            >
              {isSigningIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{isBn ? 'Google দিয়ে সংযুক্ত করুন' : 'Connect Google Account'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleSyncClick}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors min-h-[40px]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>{isBn ? 'Firestore সিঙ্ক করুন' : 'Sync to Firestore'}</span>
              </button>

              {currentCloudDoc && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setConfirmRestoreRecord(currentCloudDoc)}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors min-h-[40px]"
                >
                  <CloudDownload className="w-4 h-4 text-emerald-600" />
                  <span>{isBn ? 'ক্লাউড রিস্টোর' : 'Restore Cloud'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void signOut(firestoreAuth)}
                title="Disconnect Firebase Google Account"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors min-h-[40px]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Explicit Overwrite Confirmation */}
      {confirmOverwrite && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {isBn
                ? 'ক্লাউডে পূর্বের ব্যাকআপ আপডেট/প্রতিস্থাপন করতে চান? বর্তমান অফলাইন ডেটা নিরাপদ থাকবে।'
                : 'Overwrite your existing Firestore cloud snapshot with current local store data?'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmOverwrite(false)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-700 font-semibold cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => void executeUploadSync()}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
            >
              {isBn ? 'নিশ্চিত আপডেট' : 'Confirm Sync'}
            </button>
          </div>
        </div>
      )}

      {/* Explicit Restore Confirmation */}
      {confirmRestoreRecord && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              {isBn
                ? `"${confirmRestoreRecord.storeName}" (${confirmRestoreRecord.updatedAt ? new Date(confirmRestoreRecord.updatedAt).toLocaleString() : ''}) থেকে লোকাল ডেটাবেস রিস্টোর করতে চান?`
                : `Replace local store data with Firestore snapshot for "${confirmRestoreRecord.storeName}"?`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmRestoreRecord(null)}
              className="px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-slate-700 font-semibold cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => void executeRestore(confirmRestoreRecord)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              {isBn ? 'নিশ্চিত রিস্টোর' : 'Confirm Restore'}
            </button>
          </div>
        </div>
      )}

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="break-words min-w-0">{statusMsg.text}</span>
        </div>
      )}

      {fbUser && cloudStores.length > 0 && !compact && (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
          <div className="px-3.5 py-2 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {isBn
                  ? `ক্লাউড স্ন্যাপশটসমূহ (${cloudStores.length})`
                  : `Synced Firestore Store Snapshots (${cloudStores.length})`}
              </span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">AES-256-GCM Encrypted</span>
          </div>
          {cloudStores.map((cs) => (
            <div
              key={cs.id}
              className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs bg-white"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{cs.storeName}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {cs.updatedAt ? new Date(cs.updatedAt).toLocaleString() : 'Synced'}
                  {cs.encryptedSnapshot
                    ? ` · ${Math.round(cs.encryptedSnapshot.length / 1024)} KB`
                    : ''}
                </div>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setConfirmRestoreRecord(cs)}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{isBn ? 'রিস্টোর' : 'Restore'}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
