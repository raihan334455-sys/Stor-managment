import React from 'react';
import { X, Database } from 'lucide-react';
import { FirestoreSyncCard } from './FirestoreSyncCard';
import { useApp } from '../../context/AppContext';

interface QuickCloudSyncModalProps {
  onClose: () => void;
}

export const QuickCloudSyncModal: React.FC<QuickCloudSyncModalProps> = ({ onClose }) => {
  const { store } = useApp();
  const isBn = store.language === 'bn';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 no-print">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {isBn ? 'Firebase Firestore ক্লাউড সিঙ্ক' : 'Firebase Firestore Cloud Sync'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isBn
                  ? 'নিরাপদ এনক্রিপ্টেড ক্লাউড ব্যাকআপ ও রিস্টোর'
                  : 'Encrypted multi-device backup & restore'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <FirestoreSyncCard />
      </div>
    </div>
  );
};
