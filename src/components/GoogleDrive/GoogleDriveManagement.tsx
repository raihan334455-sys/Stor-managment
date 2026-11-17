import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  googleSignIn,
  googleSignOut,
  getAccessToken,
  initDriveAuth,
} from '../../services/googleDriveAuth';
import {
  listDriveFiles,
  getDriveAbout,
  getOrCreatePOSFolder,
  uploadJsonToDrive,
  updateJsonInDrive,
  uploadFileToDrive,
  downloadDriveFileText,
  deleteDriveFile,
  createDriveFolder,
  DriveFileItem,
  DriveStorageQuota,
} from '../../services/googleDriveApi';
import { QuickDriveUpdateModal } from './QuickDriveUpdateModal';
import { DBStorage } from '../../db/storage';
import { DatabaseBackup as IDatabaseBackup } from '../../types';
import {
  Cloud,
  CloudUpload,
  FolderPlus,
  RefreshCw,
  Search,
  Trash2,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Folder,
  FileCode,
  FileText,
  HardDrive,
  LogOut,
  ShieldAlert,
  ShoppingCart,
  Upload,
} from 'lucide-react';

export const GoogleDriveManagement: React.FC = () => {
  const { activeUser, setActiveTab, addAuditLog, refreshData } = useApp();

  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [storageQuota, setStorageQuota] = useState<DriveStorageQuota | null>(null);

  // File explorer state
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderPath, setFolderPath] = useState<{ id?: string; name: string }[]>([
    { name: 'My Drive (All Files)' },
  ]);

  // Modals & Feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isUploadingBackup, setIsUploadingBackup] = useState<boolean>(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [fileToRestore, setFileToRestore] = useState<DriveFileItem | null>(null);
  const [fileToUpdate, setFileToUpdate] = useState<DriveFileItem | null>(null);
  const [showQuickUpdateModal, setShowQuickUpdateModal] = useState<boolean>(false);
  const [isUpdatingFile, setIsUpdatingFile] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Guard for visitor
  if (activeUser?.role === 'visitor') {
    return (
      <div className="min-h-full w-full bg-slate-50 flex items-center justify-center p-4 sm:p-8">
        <div className="pos-modal-enter p-8 max-w-lg w-full text-center bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">অ্যাক্সেস সংরক্ষিত (Access Restricted)</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              ভিজিটর অ্যাকাউন্টে গুগল ড্রাইভ ও ক্লাউড সিঙ্ক দেখার অনুমতি নেই। কেবল অ্যাডমিন এই ডেটা পরিচালনা করতে পারবেন।
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('pos')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>পিওএস টার্মিনালে ফিরে যান (Return to POS)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check auth state on load
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, accessToken) => {
        setToken(accessToken);
        setUserProfile(user);
        loadDriveData(accessToken, currentFolderId);
      },
      () => {
        setToken(null);
        setUserProfile(null);
        setStorageQuota(null);
        setFiles([]);
      }
    );

    // Initial check if token is already in memory
    getAccessToken().then((cached) => {
      if (cached) {
        setToken(cached);
        loadDriveData(cached, currentFolderId);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadDriveData = async (accessToken?: string, folderId?: string) => {
    setIsLoading(true);
    try {
      const [quota, driveFiles] = await Promise.all([
        getDriveAbout().catch(() => null),
        listDriveFiles({ folderId, searchQuery }),
      ]);
      if (quota) setStorageQuota(quota);
      setFiles(driveFiles);
    } catch (err: any) {
      console.warn('Notice loading Drive data:', err?.message || err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load files from Google Drive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUserProfile(result.user);
        setStatusMessage({ type: 'success', text: `Google Drive connected successfully as ${result.user.email}!` });
        await loadDriveData(result.accessToken);
      } else {
        // User closed or dismissed the popup without signing in
        setStatusMessage({
          type: 'info',
          text: 'Google sign-in popup was closed before completing. Click "Sign in with Google" when you are ready to connect.',
        });
      }
    } catch (err: any) {
      console.warn('Google sign-in attempt notice:', err?.message || err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Google Drive authentication could not be completed.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setToken(null);
      setUserProfile(null);
      setStorageQuota(null);
      setFiles([]);
      setStatusMessage({ type: 'success', text: 'Disconnected from Google Drive.' });
    } catch (err: any) {
      console.warn('Sign out notice:', err?.message || err);
    }
  };

  // Instant POS Database Backup Upload
  const handleUploadPOSBackup = async () => {
    if (!token) return;
    setIsUploadingBackup(true);
    setStatusMessage(null);
    try {
      const posFolderId = await getOrCreatePOSFolder();
      const backupData = DBStorage.exportFullBackup();
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `superstore_pos_backup_${nowStr}.json`;

      const uploaded = await uploadJsonToDrive(filename, backupData, posFolderId);
      addAuditLog(
        'GOOGLE_DRIVE_BACKUP',
        'Google Drive',
        `Exported full POS database snapshot to Google Drive: '${filename}' (${uploaded.id})`
      );

      setStatusMessage({
        type: 'success',
        text: `Full POS database backup snapshot '${filename}' uploaded to Google Drive successfully!`,
      });

      // Reload files
      await loadDriveData(token, currentFolderId);
    } catch (err: any) {
      console.warn('Backup upload note:', err?.message || err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to upload POS backup to Google Drive.' });
    } finally {
      setIsUploadingBackup(false);
    }
  };

  // Create New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !token) return;
    try {
      await createDriveFolder(newFolderName.trim(), currentFolderId);
      setStatusMessage({ type: 'success', text: `Folder '${newFolderName}' created successfully!` });
      setNewFolderName('');
      setShowNewFolderModal(false);
      await loadDriveData(token, currentFolderId);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create folder' });
    }
  };

  // Upload custom file from disk to Drive
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !token) return;
    setIsLoading(true);
    try {
      await uploadFileToDrive(selected, currentFolderId);
      setStatusMessage({ type: 'success', text: `File '${selected.name}' uploaded to Google Drive successfully!` });
      await loadDriveData(token, currentFolderId);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to upload file' });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Restore POS Database from Drive JSON file
  const handleConfirmRestore = async () => {
    if (!fileToRestore || !token) return;
    setIsRestoring(true);
    try {
      const text = await downloadDriveFileText(fileToRestore.id);
      const parsed = JSON.parse(text) as IDatabaseBackup;

      if (!parsed.store || !parsed.users || !parsed.products) {
        throw new Error('Selected file is not a valid POS database backup.');
      }

      const success = DBStorage.restoreFullBackup(parsed);
      if (success) {
        addAuditLog(
          'GOOGLE_DRIVE_RESTORE',
          'Google Drive',
          `Restored entire POS database from Google Drive backup '${fileToRestore.name}'`
        );
        refreshData();
        setStatusMessage({
          type: 'success',
          text: `POS database restored successfully from Google Drive backup '${fileToRestore.name}'!`,
        });
        setFileToRestore(null);
      } else {
        throw new Error('Failed to restore data into offline local database.');
      }
    } catch (err: any) {
      console.warn('Restore note:', err?.message || err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to restore backup from Google Drive.' });
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete File with Mandatory User Confirmation
  const handleConfirmDelete = async () => {
    if (!fileToDelete || !token) return;
    try {
      await deleteDriveFile(fileToDelete.id);
      addAuditLog(
        'GOOGLE_DRIVE_DELETE',
        'Google Drive',
        `Deleted file '${fileToDelete.name}' from Google Drive (${fileToDelete.id})`
      );
      setStatusMessage({ type: 'success', text: `File '${fileToDelete.name}' deleted from Google Drive.` });
      setFileToDelete(null);
      await loadDriveData(token, currentFolderId);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete file from Google Drive.' });
    }
  };

  // Overwrite / Update an existing Drive JSON backup file after explicit confirmation
  const handleConfirmUpdateFile = async () => {
    if (!fileToUpdate || !token) return;
    setIsUpdatingFile(true);
    try {
      const backupData = DBStorage.exportFullBackup();
      const updated = await updateJsonInDrive(fileToUpdate.id, backupData, fileToUpdate.name);
      addAuditLog(
        'GOOGLE_DRIVE_UPDATE',
        'Google Drive',
        `Updated Google Drive backup '${updated.name}' (${updated.id}) with latest POS data`
      );
      setStatusMessage({
        type: 'success',
        text: `Google Drive file '${updated.name}' updated with latest POS database successfully!`,
      });
      setFileToUpdate(null);
      await loadDriveData(token, currentFolderId);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to update file in Google Drive.',
      });
    } finally {
      setIsUpdatingFile(false);
    }
  };

  // Navigate into folder
  const handleOpenFolder = (folder: DriveFileItem) => {
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    loadDriveData(token || undefined, folder.id);
  };

  // Navigate breadcrumb
  const handleNavigateBreadcrumb = (index: number) => {
    const target = folderPath[index];
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(target.id);
    loadDriveData(token || undefined, target.id);
  };

  // Format bytes
  const formatBytes = (bytesStr?: string | number): string => {
    if (!bytesStr) return '0 B';
    const bytes = typeof bytesStr === 'string' ? parseInt(bytesStr, 10) : bytesStr;
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Calculate storage usage percentage
  const usageBytes = storageQuota?.usage ? parseInt(storageQuota.usage, 10) : 0;
  const limitBytes = storageQuota?.limit ? parseInt(storageQuota.limit, 10) : 0;
  const usagePercent = limitBytes > 0 ? Math.min(100, Math.round((usageBytes / limitBytes) * 100)) : 0;

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-full w-full text-slate-800 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2.5 text-slate-800">
            <Cloud className="w-6 h-6 text-blue-600" />
            <span>Google Drive Cloud Storage & Backup Sync</span>
          </h1>
          <p className="text-xs text-slate-500">
            Securely back up POS inventory, sales records, and financial receipts directly to your personal or organization Google Drive.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {token && (
            <button
              onClick={() => loadDriveData(token, currentFolderId)}
              disabled={isLoading}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Status Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'info' ? (
              <Cloud className="w-5 h-5 text-blue-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Not Connected State -> Sign In With Google Card */}
      {!token ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-md">
            <Cloud className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Connect with Google Drive</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Sign in with your Google Account to automatically sync, store, and restore full POS database backups, daily sales snapshots, and receipts in your Google Drive cloud storage.
            </p>
          </div>

          <div className="pt-2 flex flex-col items-center justify-center">
            {/* Official Material Styled Sign in with Google Button */}
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-sm transition-all hover:shadow hover:border-slate-400 active:scale-[0.98] cursor-pointer disabled:opacity-60"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                ></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-100 text-left">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>Automatic Cloud Backup</span>
              </div>
              <p className="text-[11px] text-slate-500">
                1-click upload of all POS sales, stock, and accounting data to your Drive.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant Cloud Restore</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Restore previous snapshots directly from Google Drive onto any device.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-600" />
                <span>Drive File Browser</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Explore folders, view files, and upload custom receipts and spreadsheets.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Connected State -> Cloud Dashboard & File Explorer */
        <div className="space-y-6">
          {/* User Account & Quota Widget */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName || 'Google User'}
                  className="w-14 h-14 rounded-2xl border-2 border-blue-500/30 object-cover shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                  {userProfile?.displayName?.charAt(0) || userProfile?.email?.charAt(0) || 'G'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900">{userProfile?.displayName || 'Google Drive User'}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Connected
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">{userProfile?.email}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Google Drive API v3 Enabled & Ready</p>
              </div>
            </div>

            {/* Storage Quota Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:border-l md:border-slate-100 md:pl-6">
              {storageQuota && (
                <div className="min-w-[200px] space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Drive Storage</span>
                    <span>{formatBytes(storageQuota.usage)} / {formatBytes(storageQuota.limit)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        usagePercent > 90 ? 'bg-rose-500' : usagePercent > 75 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">{usagePercent}% Used</div>
                </div>
              )}

              <button
                onClick={handleSignOut}
                className="px-3.5 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Disconnect Google Drive"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

          {/* Quick POS Backup & Actions Bar */}
          <div className="bg-[#201c56] rounded-2xl p-5 sm:p-6 text-white border border-[#2d2775] flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
                <CloudUpload className="w-3.5 h-3.5 text-blue-200" />
                <span>Direct Cloud Synchronization</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight">Instant Google Drive POS Database Backup</h3>
              <p className="text-xs text-blue-100/90 leading-relaxed">
                Creates a full offline JSON snapshot of your products, categories, sales, customers, dues, and supplier transactions, and uploads it securely to the <code className="bg-black/20 px-1 py-0.5 rounded font-mono text-amber-200">SuperStore_POS_Backups</code> folder in your Drive.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowQuickUpdateModal(true)}
                className="px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 active:scale-[0.98] font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Update Live Sync File</span>
              </button>

              <button
                onClick={handleUploadPOSBackup}
                disabled={isUploadingBackup}
                className="px-4 py-3 bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white font-bold text-xs rounded-xl border border-white/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                <CloudUpload className={`w-4 h-4 ${isUploadingBackup ? 'animate-bounce' : ''}`} />
                <span>{isUploadingBackup ? 'Uploading Snapshot...' : 'Upload Dated Snapshot'}</span>
              </button>

              <button
                onClick={() => setShowNewFolderModal(true)}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white font-semibold text-xs rounded-xl border border-white/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Folder</span>
              </button>

              <label className="px-4 py-3 bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white font-semibold text-xs rounded-xl border border-white/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Files Explorer Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            {/* Explorer Controls: Breadcrumbs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-xs font-medium text-slate-500 overflow-x-auto py-1">
                {folderPath.map((f, idx) => {
                  const isLast = idx === folderPath.length - 1;
                  return (
                    <React.Fragment key={idx}>
                      <button
                        onClick={() => handleNavigateBreadcrumb(idx)}
                        className={`hover:text-blue-600 transition-colors whitespace-nowrap ${
                          isLast ? 'font-bold text-slate-800' : 'text-slate-500'
                        }`}
                      >
                        {f.name}
                      </button>
                      {!isLast && <span className="text-slate-300">/</span>}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Search Filter */}
              <div className="relative w-full sm:w-auto sm:min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadDriveData(token, currentFolderId)}
                  placeholder="Search files in Drive..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Files & Folders Table */}
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-500">Loading files from Google Drive...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Folder className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">No files found in this folder</p>
                  <p className="text-xs text-slate-400">
                    Upload a file or click "Upload Latest POS Backup Now" to create your first cloud backup.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Compact File Cards */}
                <div className="md:hidden space-y-2.5">
                  {files.map((file) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    const isJson = file.name.endsWith('.json') || file.mimeType.includes('json');

                    return (
                      <div
                        key={file.id}
                        className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isFolder ? (
                              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                                <Folder className="w-4 h-4" />
                              </div>
                            ) : isJson ? (
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <FileCode className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              {isFolder ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFolder(file)}
                                  className="font-bold text-sm text-slate-900 hover:text-blue-600 text-left truncate block w-full cursor-pointer"
                                >
                                  {file.name}
                                </button>
                              ) : (
                                <div className="font-semibold text-xs text-slate-900 truncate">
                                  {file.name}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-500 font-mono">
                                {isFolder ? 'Folder' : formatBytes(file.size)}
                                {file.modifiedTime &&
                                  ` · ${new Date(file.modifiedTime).toLocaleDateString()}`}
                              </div>
                            </div>
                          </div>
                          {isJson && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-mono font-bold shrink-0">
                              BACKUP
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/80">
                          {isFolder && (
                            <button
                              type="button"
                              onClick={() => handleOpenFolder(file)}
                              className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              Open Folder
                            </button>
                          )}
                          {isJson && (
                            <>
                              <button
                                type="button"
                                onClick={() => setFileToUpdate(file)}
                                className="flex-1 py-1.5 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Update</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setFileToRestore(file)}
                                className="flex-1 py-1.5 px-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            </>
                          )}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-white text-slate-600 rounded-lg border border-slate-200"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 bg-white text-rose-500 rounded-lg border border-slate-200 cursor-pointer"
                            title="Delete File from Google Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60 font-semibold uppercase text-[11px]">
                        <th className="p-3">Name</th>
                        <th className="p-3">Size</th>
                        <th className="p-3">Modified</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {files.map((file) => {
                        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                        const isJson = file.name.endsWith('.json') || file.mimeType.includes('json');

                        return (
                          <tr key={file.id} className="hover:bg-slate-50/80 transition-colors group">
                            {/* Name and Icon */}
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {isFolder ? (
                                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                                    <Folder className="w-4 h-4" />
                                  </div>
                                ) : isJson ? (
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                    <FileCode className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                )}

                                <div>
                                  {isFolder ? (
                                    <button
                                      onClick={() => handleOpenFolder(file)}
                                      className="font-bold text-slate-800 hover:text-blue-600 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <span>{file.name}</span>
                                    </button>
                                  ) : (
                                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                                      <span>{file.name}</span>
                                      {isJson && (
                                        <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded font-mono font-bold">
                                          BACKUP
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                                    ID: {file.id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Size */}
                            <td className="p-3 font-mono text-slate-600 text-[11px]">
                              {isFolder ? '—' : formatBytes(file.size)}
                            </td>

                            {/* Modified */}
                            <td className="p-3 text-slate-500 text-[11px]">
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleDateString([], {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isJson && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setFileToUpdate(file)}
                                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Update this Google Drive file with current POS database"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      <span>Update File</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setFileToRestore(file)}
                                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Restore POS Database from this Backup"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Restore to POS</span>
                                    </button>
                                  </>
                                )}

                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg border border-slate-200 transition-colors"
                                    title="Open in Google Drive"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setFileToDelete(file)}
                                  className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                                  title="Delete File from Google Drive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-base">
              <FolderPlus className="w-5 h-5" />
              <span>Create New Folder in Drive</span>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Folder Name:</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Invoices, Monthly Reports"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for DELETING files */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Delete from Google Drive?</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">"{fileToDelete.name}"</strong> from your Google Drive? This action will permanently remove this item from your cloud storage.
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Explicit Confirmation Required</span>
              </div>
              <p>Please confirm that you want to delete this cloud item.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for RESTORING database from Drive */}
      {fileToRestore && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Restore POS Database from Drive?</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to restore the POS database from the Google Drive backup file <strong className="text-slate-900">"{fileToRestore.name}"</strong>. Current active products, sales, and accounts will be replaced with the contents of this snapshot.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
              <div className="font-bold">⚠️ Warning</div>
              <p>Make sure you have exported your latest data before proceeding with a restore.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setFileToRestore(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Restoring Database...' : 'Confirm & Restore'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for UPDATING / OVERWRITING an existing Drive file */}
      {fileToUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-base">
              <CloudUpload className="w-5 h-5 shrink-0" />
              <span>Update Existing Google Drive File?</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to update <strong className="text-slate-900">"{fileToUpdate.name}"</strong> in Google Drive with your latest offline POS database snapshot? The existing file content in Drive will be overwritten.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isUpdatingFile}
                onClick={() => setFileToUpdate(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingFile}
                onClick={handleConfirmUpdateFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingFile ? 'animate-spin' : ''}`} />
                <span>{isUpdatingFile ? 'Updating File...' : 'Confirm & Update File'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuickUpdateModal && (
        <QuickDriveUpdateModal
          onClose={() => setShowQuickUpdateModal(false)}
          onSyncComplete={({ file, action }) => {
            setStatusMessage({
              type: 'success',
              text: `Google Drive live sync file '${file.name}' ${
                action === 'updated' ? 'updated' : 'created'
              } successfully!`,
            });
            loadDriveData(token || undefined, currentFolderId);
          }}
        />
      )}
    </div>
  );
};
