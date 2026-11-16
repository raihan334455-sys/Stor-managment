import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DBStorage } from '../../db/storage';
import { getAccessToken, googleSignIn } from '../../services/googleDriveAuth';
import {
  DriveFileItem,
  findLiveSyncFileInPOSFolder,
  LIVE_SYNC_FILENAME,
  syncLatestBackupToDrive,
} from '../../services/googleDriveApi';
import {
  Cloud,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  X,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';

interface QuickDriveUpdateModalProps {
  onClose: () => void;
  onSyncComplete?: (result: { file: DriveFileItem; action: 'updated' | 'created' }) => void;
}

export const QuickDriveUpdateModal: React.FC<QuickDriveUpdateModalProps> = ({
  onClose,
  onSyncComplete,
}) => {
  const { products, sales, customers, suppliers, store, updateStore, addAuditLog, setActiveTab } =
    useApp();

  const [token, setToken] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isInspectingDrive, setIsInspectingDrive] = useState<boolean>(false);
  const [existingLiveFile, setExistingLiveFile] = useState<DriveFileItem | null>(null);
  const [posFolderId, setPosFolderId] = useState<string | undefined>(undefined);
  const [alsoSaveArchive, setAlsoSaveArchive] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [syncedResult, setSyncedResult] = useState<{
    file: DriveFileItem;
    archiveFile?: DriveFileItem;
    action: 'updated' | 'created';
  } | null>(null);

  const inspectLiveSyncTarget = async () => {
    setIsInspectingDrive(true);
    setErrorMsg('');
    try {
      const { folderId, existingFile } = await findLiveSyncFileInPOSFolder();
      setPosFolderId(folderId);
      setExistingLiveFile(existingFile);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google Drive ফোল্ডার যাচাই করা যায়নি।');
    } finally {
      setIsInspectingDrive(false);
    }
  };

  useEffect(() => {
    let active = true;
    getAccessToken()
      .then(async (cached) => {
        if (!active) return;
        setToken(cached);
        setIsCheckingAuth(false);
        if (cached) {
          await inspectLiveSyncTarget();
        }
      })
      .catch(() => {
        if (active) setIsCheckingAuth(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleGoogleConnect = async () => {
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      const res = await googleSignIn();
      if (res) {
        setToken(res.accessToken);
        await inspectLiveSyncTarget();
      } else {
        setErrorMsg('Google সাইন-ইন পপআপ সম্পন্ন হয়নি। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google Drive-এ সংযুক্ত হওয়া যায়নি।');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleConfirmUpdateDrive = async () => {
    setIsSyncing(true);
    setErrorMsg('');
    try {
      const backupPayload = DBStorage.exportFullBackup();
      const result = await syncLatestBackupToDrive(backupPayload, {
        existingFileId: existingLiveFile?.id,
        folderId: posFolderId,
        alsoSaveTimestampedCopy: alsoSaveArchive,
      });

      const syncedAt = new Date().toISOString();
      updateStore({
        ...store,
        last_drive_sync_at: syncedAt,
        updated_at: syncedAt,
      });

      addAuditLog(
        'GOOGLE_DRIVE_UPDATE',
        'Google Drive',
        `${result.action === 'updated' ? 'Updated' : 'Created'} live POS sync file '${
          result.primaryFile.name
        }' in Google Drive (${result.primaryFile.id})${
          result.archiveFile ? ` + snapshot '${result.archiveFile.name}'` : ''
        }`
      );

      setSyncedResult({
        file: result.primaryFile,
        archiveFile: result.archiveFile,
        action: result.action,
      });
      if (onSyncComplete) {
        onSyncComplete({ file: result.primaryFile, action: result.action });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google Drive আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl text-slate-800 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Click to Update Google Drive
              </h3>
              <p className="text-[11px] text-slate-500">
                এক ক্লিকে আপনার সব POS ডেটা Google Drive-এ আপডেট করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isCheckingAuth ? (
          <div className="py-10 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Checking Google Drive connection...
            </p>
          </div>
        ) : !token ? (
          /* Step 1: Connect Google Account */
          <div className="py-3 text-center space-y-4">
            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800">
                Google Drive অ্যাকাউন্ট সংযুক্ত করুন
              </p>
              <p>
                নিরাপদভাবে আপনার দোকানের পণ্য, বিক্রয়, বাকি হিসাব ও সেটিংস Google Drive-এ সিঙ্ক ও আপডেট করতে সাইন-ইন করুন।
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleConnect}
              disabled={isSigningIn}
              className="w-full inline-flex items-center justify-center gap-3 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>
        ) : syncedResult ? (
          /* Step 3: Completed Success View */
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900">
                Google Drive {syncedResult.action === 'updated' ? 'Updated' : 'Synced'} Successfully!
              </h4>
              <p className="text-xs text-emerald-800">
                ফাইল <strong className="font-mono">{syncedResult.file.name}</strong> সফলভাবে{' '}
                {syncedResult.action === 'updated' ? 'আপডেট' : 'আপলোড'} হয়েছে।
              </p>
              {syncedResult.archiveFile && (
                <p className="text-[11px] text-emerald-700 font-mono">
                  + Snapshot: {syncedResult.archiveFile.name}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {syncedResult.file.webViewLink && (
                <a
                  href={syncedResult.file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Drive</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveTab('drive');
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Drive Explorer</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Explicit Confirmation Before Updating / Overwriting Drive File */
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>সিঙ্ক ডেটা সারসংক্ষেপ (POS Data Summary)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  Drive Ready
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  Products: <strong className="text-slate-900">{products.filter((p) => !p.archived).length}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  Sales Invoices: <strong className="text-slate-900">{sales.length}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  Customers: <strong className="text-slate-900">{customers.length}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  Suppliers: <strong className="text-slate-900">{suppliers.length}</strong>
                </div>
              </div>
            </div>

            {isInspectingDrive ? (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Checking existing backup file in SuperStore_POS_Backups...</span>
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {existingLiveFile
                      ? 'Confirm Overwrite & Update Existing Drive File'
                      : 'Confirm Upload to Google Drive'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  {existingLiveFile ? (
                    <>
                      Google Drive-এর <code className="font-mono font-bold">SuperStore_POS_Backups/{LIVE_SYNC_FILENAME}</code> ফাইলটি সর্বশেষ POS ডেটা দিয়ে আপডেট (Overwrite) করা হবে।
                      {existingLiveFile.modifiedTime && (
                        <span className="block mt-1 font-mono text-[10px]">
                          Last updated: {new Date(existingLiveFile.modifiedTime).toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Google Drive-এর <code className="font-mono font-bold">SuperStore_POS_Backups</code> ফোল্ডারে নতুন লাইভ ব্যাকআপ <code className="font-mono font-bold">{LIVE_SYNC_FILENAME}</code> তৈরি করা হবে।
                    </>
                  )}
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={alsoSaveArchive}
                onChange={(e) => setAlsoSaveArchive(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>তারিখসহ আলাদা ব্যাকআপ কপিও সেভ করুন (Also save timestamped snapshot)</span>
            </label>

            {store.last_drive_sync_at && (
              <div className="text-[11px] text-slate-500 font-mono text-center">
                Last synced: {new Date(store.last_drive_sync_at).toLocaleString()}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSyncing}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSyncing || isInspectingDrive}
                onClick={handleConfirmUpdateDrive}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                <span>
                  {isSyncing
                    ? 'Updating Google Drive...'
                    : existingLiveFile
                    ? 'Confirm & Update Google Drive'
                    : 'Confirm & Upload to Google Drive'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
