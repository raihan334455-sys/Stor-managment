import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { DBStorage } from '../../db/storage';
import {
  DatabaseBackup,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FileCheck,
  ShieldAlert,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { DatabaseBackup as IDatabaseBackup } from '../../types';

export const BackupManagement: React.FC = () => {
  const {
    products,
    customers,
    sales,
    purchases,
    expenses,
    auditLogs,
    refreshData,
    addAuditLog,
    clearTransactionHistory,
    wipeAllData,
    resetToDemoData,
  } = useApp();


  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [resetActionType, setResetActionType] = useState<'clear_history' | 'wipe_all' | 'reset_demo'>('clear_history');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Storage usage calculation
  let totalBytesUsed = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const val = localStorage.getItem(key) || '';
      totalBytesUsed += key.length + val.length;
    }
  }
  const storageKB = (totalBytesUsed / 1024).toFixed(1);

  // Export full JSON backup
  const handleExportBackup = () => {
    try {
      const backupData = DBStorage.exportFullBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const nowStr = new Date().toISOString().slice(0, 10);

      const link = document.createElement('a');
      link.href = url;
      link.download = `grocery_pos_backup_${nowStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addAuditLog('BACKUP_EXPORTED', 'Backup', 'Full offline JSON database snapshot exported and downloaded');
      setMessage({
        type: 'success',
        text: 'Backup file exported and downloaded successfully!',
      });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Export failed: ${err.message || 'Unknown error'}`,
      });
    }
  };

  // Restore JSON backup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as IDatabaseBackup;

        if (!parsed.store || !parsed.products) {
          throw new Error('Invalid backup file schema. Missing store or product collections.');
        }

        const success = DBStorage.restoreFullBackup(parsed);
        if (success) {
          refreshData();
          addAuditLog(
            'BACKUP_RESTORED',
            'Backup',
            `Restored full database from backup snapshot dated ${parsed.timestamp || 'Unknown'}`
          );
          setMessage({
            type: 'success',
            text: `Database successfully restored from backup (${parsed.products?.length || 0} products, ${parsed.sales?.length || 0} sales restored).`,
          });
        } else {
          throw new Error('Restore operation failed.');
        }
      } catch (err: any) {
        setMessage({
          type: 'error',
          text: `Failed to restore: ${err.message || 'Invalid JSON file'}`,
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };


  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
          <DatabaseBackup className="w-6 h-6 text-blue-600" />
          <span>Database Backup, Disaster Recovery & Restore</span>
        </h1>
        <p className="text-xs text-slate-500">
          Export full store data to offline JSON files, restore from previous snapshots, or reset to demo seeds.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Database Diagnostic Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Storage Space</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{storageKB} KB</div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">Indexed Locally</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Catalog Size</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{products.length} Products</div>
          <span className="text-[10px] text-slate-500 font-semibold mt-1 inline-block">
            {products.reduce((acc, p) => acc + p.variants.length, 0)} Variants
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Transactions</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{sales.length} Sales</div>
          <span className="text-[10px] text-slate-500 font-semibold mt-1 inline-block">
            {purchases.length} Purchases
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Audit & Logs</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{auditLogs.length} Events</div>
          <span className="text-[10px] text-blue-600 font-semibold mt-1 inline-block">Security Trail</span>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Export Full JSON Database Backup</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Creates a complete offline JSON snapshot of your grocery catalog, stock variants, invoices, customer
              and supplier dues, operating expenses, and audit trails. Keep backups on your desktop or USB drive.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Backup Snapshot (.json)</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Restore Database from JSON Snapshot</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload a previously exported backup file to restore all store products, historical transactions, customer
              ledgers, and configurations. Restores data immediately without losing synchronization.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Select & Restore Backup File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Data Remove & History Reset Operations */}
      <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <span>ডেটা মুছে ফেলা ও হিস্ট্রি রিসেট (All History & Data Removal Zone)</span>
        </div>
        <p className="text-xs text-slate-500">
          আপনার প্রয়োজন অনুযায়ী শুধুমাত্র বিক্রয় ও বাকি হিস্ট্রি মুছুন অথবা নতুন লাইভ ব্যবসা শুরুর জন্য সম্পূর্ণ স্টোর ওয়াইপ করুন।
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Card 1: Clear History Only */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                <span>বিক্রয় ও বাকি হিস্ট্রি মুছুন</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                পণ্য ক্যাটালগ <strong>অক্ষত থাকবে</strong>। শুধুমাত্র সমস্ত পূর্বের বিক্রয়, কাস্টমার বাকি লেজার, খরচ এবং ক্যাশ ড্রয়ার হিস্ট্রি মুছে ০ করা হবে।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowResetConfirm(true);
                setResetInput('');
                setResetActionType('clear_history');
              }}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear History Only</span>
            </button>
          </div>

          {/* Card 2: Wipe All Store Data */}
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>সব ডেটা মুছে একদম নতুন শুরু</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                দোকানের পণ্য, স্টক, কাস্টমার, সাপ্লায়ার ও সমস্ত লেনদেন চিরতরে মুছে একদম শূন্য (Blank) ডাটাবেস নিয়ে নতুন ব্যবসা শুরু করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowResetConfirm(true);
                setResetInput('');
                setResetActionType('wipe_all');
              }}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe All Data</span>
            </button>
          </div>

          {/* Card 3: Demo Seeds Reset */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
                <span>ডেমো ডেটায় রিসেট</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                স্টোর ডাটাবেসকে সফটওয়্যারের প্রাথমিক ডেমো পণ্যে (চিনি, সয়াবিন তেল, আটা, চাল, মশলা) ফিরিয়ে নিয়ে যাবে।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowResetConfirm(true);
                setResetInput('');
                setResetActionType('reset_demo');
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Demo Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                {resetActionType === 'clear_history'
                  ? 'বিক্রয় ও বাকি হিস্ট্রি মুছে ফেলা নিশ্চিত করুন'
                  : resetActionType === 'wipe_all'
                  ? 'সম্পূর্ণ স্টোর ডেটা ওয়াইপ নিশ্চিত করুন'
                  : 'ডেমো ডেটায় রিসেট নিশ্চিত করুন'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {resetActionType === 'clear_history'
                ? 'এটি আপনার সমস্ত বিক্রয় রেকর্ড, কাস্টমার বাকি লেজার, খরচ ও ক্যাশ সেশন মুছে দেবে। পণ্যের ক্যাটালগ অক্ষত থাকবে।'
                : resetActionType === 'wipe_all'
                ? 'এটি পণ্য তালিকা, স্টক, বিক্রয়, বাকি এবং কাস্টমার সহ সমস্ত ডেটা চিরতরে মুছে ফেলবে।'
                : 'এটি বর্তমান পরিবর্তন মুছে সফটওয়্যারের মূল ডেমো ডেটায় স্টোরকে নিয়ে যাবে।'}
            </p>

            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-700">
                নিশ্চিত করতে নিচে{' '}
                <strong className="text-rose-600 font-mono">
                  {resetActionType === 'clear_history' ? 'CLEAR' : resetActionType === 'wipe_all' ? 'WIPE' : 'RESET'}
                </strong>{' '}
                লিখুন:
              </label>
              <input
                type="text"
                placeholder={`Type ${resetActionType === 'clear_history' ? 'CLEAR' : resetActionType === 'wipe_all' ? 'WIPE' : 'RESET'}`}
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-center tracking-widest text-rose-600 focus:outline-none focus:border-rose-500 uppercase"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetInput('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                disabled={
                  (resetActionType === 'clear_history' && resetInput.trim().toUpperCase() !== 'CLEAR') ||
                  (resetActionType === 'wipe_all' && resetInput.trim().toUpperCase() !== 'WIPE') ||
                  (resetActionType === 'reset_demo' && resetInput.trim().toUpperCase() !== 'RESET')
                }
                onClick={() => {
                  if (resetActionType === 'clear_history') {
                    clearTransactionHistory();
                    setMessage({
                      type: 'success',
                      text: 'বিক্রয় ও লেনদেন হিস্ট্রি সফলভাবে মুছে ফেলা হয়েছে (পণ্য ক্যাটালগ সংরক্ষিত আছে)।',
                    });
                  } else if (resetActionType === 'wipe_all') {
                    wipeAllData();
                    setMessage({
                      type: 'success',
                      text: 'সম্পূর্ণ স্টোর ডেটা ওয়াইপ করা হয়েছে। ফ্রেশ বিজনেস শুরু করতে প্রস্তুত।',
                    });
                  } else {
                    resetToDemoData();
                    setMessage({
                      type: 'success',
                      text: 'ডাটাবেস সফলভাবে ডেমো ডেটায় রিসেট হয়েছে।',
                    });
                  }
                  setShowResetConfirm(false);
                  setResetInput('');
                  setTimeout(() => setMessage(null), 5000);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                নিশ্চিত করুন (Confirm & Proceed)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
