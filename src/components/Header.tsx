import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Store,
  WifiOff,
  UserCheck,
  KeyRound,
  DollarSign,
  Clock,
  Globe,
  ShieldCheck,
  ChevronDown,
  Lock,
  LogOut,
} from 'lucide-react';
import { User } from '../types';

export const Header: React.FC = () => {
  const { store, activeUser, setActiveUser, users, cashSessions, updateStore, logout, lockTerminal } = useApp();

  const [timeStr, setTimeStr] = useState<string>('');
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinError, setPinError] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const openCashSession = cashSessions.find((s) => s.status === 'open');

  const handleSwitchUserClick = (u: User) => {
    setSelectedUser(u);
    setEnteredPin('');
    setPinError('');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (selectedUser.pin === enteredPin) {
      setActiveUser(selectedUser);
      setShowUserModal(false);
      setSelectedUser(null);
      setEnteredPin('');
      setPinError('');
    } else {
      setPinError('Invalid PIN code. Please try again.');
    }
  };

  const toggleLanguage = () => {
    const newLang = store.language === 'en' ? 'bn' : 'en';
    updateStore({ ...store, language: newLang });
  };

  return (
    <header className="bg-white text-slate-800 border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
      <div className="max-w-full px-6 h-16 flex items-center justify-between gap-4">
        {/* Left Store Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            {store.store_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-[280px]">
                {store.store_name}
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                <WifiOff className="w-3 h-3 text-slate-500" />
                <span>100% Offline</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[240px]">{store.store_address}</p>
          </div>
        </div>

        {/* Center Live Time & Shift Info */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 font-medium">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-mono text-slate-700">{timeStr}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 font-medium">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Shift: </span>
            {openCashSession ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Drawer (৳{openCashSession.opening_cash})
              </span>
            ) : (
              <span className="text-rose-600 font-semibold">Closed</span>
            )}
          </div>
        </div>

        {/* Right Actions & User Switcher */}
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
            title="Switch Language"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>{store.language === 'en' ? 'English' : 'বাংলা'}</span>
          </button>

          {/* User Badge & Switcher Button */}
          <button
            onClick={() => {
              setShowUserModal(true);
              setSelectedUser(activeUser);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-left group"
            title="Switch User / ক্যাশিয়ার পরিবর্তন"
          >
            <div className="w-7 h-7 rounded-md bg-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 uppercase">
              {activeUser.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                {activeUser.name}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{activeUser.role}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* Lock Terminal / Logout Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={lockTerminal}
              className="p-2 rounded-md bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-600 hover:text-amber-700 transition-colors"
              title="Lock Terminal / টার্মিনাল লক করুন"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-md bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-700 transition-colors"
              title="Logout / লগআউট করুন"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Switch Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Switch Active Cashier</h3>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              Select staff member and enter PIN code to switch terminal authorization.
            </p>

            <div className="space-y-2 mb-4">
              {users.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                const isActiveNow = activeUser.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUserClick(u)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-sm text-blue-700">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <span>{u.name}</span>
                          {isActiveNow && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">{u.role}</div>
                      </div>
                    </div>
                    {isSelected && <ShieldCheck className="w-5 h-5 text-blue-600" />}
                  </button>
                );
              })}
            </div>

            {selectedUser && (
              <form onSubmit={handlePinSubmit} className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Security PIN for {selectedUser.name}:
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    placeholder="Enter PIN (e.g. 1234)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-center text-lg tracking-widest font-mono text-blue-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {pinError && <p className="text-xs text-rose-600 mt-1 font-medium">{pinError}</p>}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1"
                  >
                    <KeyRound className="w-4 h-4" />
                    Confirm Switch
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
