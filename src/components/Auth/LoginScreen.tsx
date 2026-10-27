import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Shield,
  KeyRound,
  Store,
  WifiOff,
  Eye,
  EyeOff,
  Delete,
  LogIn,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  UserCheck,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { store, loginWithPin } = useApp();
  const [username, setUsername] = useState<string>('demo');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('bn-BD', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) +
          ' | ' +
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Physical keyboard support for numpad and typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is currently focused on an input element other than body, let them type
      const target = e.target as HTMLElement;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (!isInputFocused) {
        if (e.key >= '0' && e.key <= '9') {
          handleNumberPress(e.key);
        } else if (e.key === 'Backspace') {
          handleBackspace();
        } else if (e.key === 'Enter') {
          handleSubmit();
        } else if (e.key === 'Escape') {
          handleClear();
        }
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, username]);

  const handleNumberPress = (num: string) => {
    if (pin.length < 6) {
      setError('');
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setPin('');
  };

  const handleSubmit = (overrideId?: string, overridePin?: string) => {
    const targetId = (overrideId !== undefined ? overrideId : username).trim();
    const targetPin = overridePin !== undefined ? overridePin : pin;

    if (!targetId) {
      setError('অনুগ্রহ করে ইউজার আইডি লিখুন (Please enter user ID)');
      return;
    }

    if (!targetPin) {
      setError('অনুগ্রহ করে ৪-সংখ্যার সিকিউরিটি পিন দিন (Please enter PIN)');
      return;
    }

    const result = loginWithPin(targetId, targetPin);
    if (!result.success) {
      setError(result.message || 'ভুল পিন কোড! ডেমো পিন হলো 1234');
      setPin('');
    }
  };

  // 1-Click Instant Login as Demo Visitor
  const handleInstantDemoLogin = () => {
    setUsername('demo');
    setPin('1234');
    setError('');
    handleSubmit('demo', '1234');
  };

  // Quick fill demo visitor fields
  const handleAutoFill = () => {
    setUsername('demo');
    setPin('1234');
    setError('');
  };

  const copyToClipboard = (text: string, type: 'id' | 'pin') => {
    navigator.clipboard?.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100 select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-4 max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 border border-blue-400/30 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-600/30">
            {store.store_name?.charAt(0) || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">{store.store_name}</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <WifiOff className="w-3 h-3" />
                <span>100% Offline POS</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">{store.store_address || 'স্মার্ট মুদি ও জেনারেল ডিপার্টমেন্টাল পিওএস'}</p>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end text-xs text-slate-400 font-mono">
          <span className="text-slate-300 font-semibold">{currentTime}</span>
          <span className="text-[10px] text-slate-500">Terminal ID: POS-T01 | Branch: {store.branch_id || 'main'}</span>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="max-w-4xl w-full mx-auto my-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Left Column: Demo Account Credentials Box & ID Input */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                <span>সিকিউর টার্মিনাল লগইন</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">পিওএস টার্মিনাল লগইন</h2>
              <p className="text-xs text-slate-400">
                টার্মিনাল আনলক করতে ইউজার আইডি ও ৪-সংখ্যার পাসওয়ার্ড/পিন প্রবেশ করান।
              </p>
            </div>

            {/* ONLY Show Single Demo Account Credentials (Visitor: ID: demo, PIN: 1234) */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-blue-950/70 border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    ডেমো অ্যাকাউন্ট (Demo Account)
                  </span>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  ভিজিটর মোড (Visitor)
                </span>
              </div>

              {/* ID and PIN Badge Row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Demo ID */}
                <div className="bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
                  <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                    <span>ইউজার আইডি (ID)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('demo', 'id')}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-mono font-bold text-white mt-1 flex items-center gap-1.5">
                    <span className="text-blue-400">@</span>demo
                  </div>
                </div>

                {/* Demo Password / PIN */}
                <div className="bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
                  <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                    <span>পাসওয়ার্ড / পিন (PIN)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('1234', 'pin')}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy PIN"
                    >
                      {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-mono font-bold text-amber-400 mt-1">
                    1234
                  </div>
                </div>
              </div>

              {/* Instant 1-Click Login Button & Auto Fill */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstantDemoLogin}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>১-ক্লিকে সরাসরি ডেমো লগইন (1-Click Demo Login)</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="w-full sm:w-auto py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>অটো ফিল (Auto Fill)</span>
                </button>
              </div>
            </div>

            {/* User ID Input Field */}
            <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                ইউজার আইডি (User ID):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="demo"
                  className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white text-sm font-mono font-medium focus:outline-none transition-all"
                />
                <div className="absolute right-3 top-3 text-slate-500 text-xs font-mono font-semibold">
                  ID: demo
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                লগইন করতে আইডি <span className="font-mono text-blue-400 font-bold">demo</span> এবং ডানপাশে পিন <span className="font-mono text-amber-400 font-bold">1234</span> দিয়ে টার্মিনালে প্রবেশ করুন।
              </p>
            </div>
          </div>

          {/* Right Column: PIN Pad & Input */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px] font-mono font-semibold uppercase">
                <KeyRound className="w-3 h-3 text-blue-400" />
                <span>USER: {username.trim() || 'demo'}</span>
              </div>
              <h3 className="text-lg font-black text-white">৪-সংখ্যার সিকিউরিটি পিন দিন</h3>
              <p className="text-[11px] text-slate-400">Enter 4-digit PIN (Demo PIN: 1234)</p>
            </div>

            {/* PIN Dots & Display */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-3 justify-center py-1">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = pin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-12 h-14 rounded-2xl border flex items-center justify-center text-2xl font-mono font-bold transition-all ${
                        isFilled
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400 shadow-md shadow-blue-500/20 scale-105'
                          : 'border-slate-800 bg-slate-950/80 text-slate-600'
                      }`}
                    >
                      {isFilled ? (showPin ? pin[index] : '●') : ''}
                    </div>
                  );
                })}
              </div>

              {/* Show / Hide PIN Toggle */}
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 py-0.5 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                <span>{showPin ? 'পিন লুকান (Hide PIN)' : 'পিন দেখুন (Show PIN)'}</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Touch & Click Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumberPress(num.toString())}
                  className="h-14 rounded-2xl bg-slate-950/90 hover:bg-slate-800 active:bg-blue-600 active:text-white border border-slate-800 text-white font-mono font-bold text-xl shadow-sm transition-all flex items-center justify-center hover:scale-[1.03] active:scale-95 cursor-pointer"
                >
                  {num}
                </button>
              ))}

              {/* Clear */}
              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 border border-rose-500/20 text-rose-400 font-bold text-xs transition-all flex items-center justify-center hover:scale-[1.03] active:scale-95 cursor-pointer"
              >
                CLEAR
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => handleNumberPress('0')}
                className="h-14 rounded-2xl bg-slate-950/90 hover:bg-slate-800 active:bg-blue-600 active:text-white border border-slate-800 text-white font-mono font-bold text-xl shadow-sm transition-all flex items-center justify-center hover:scale-[1.03] active:scale-95 cursor-pointer"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 rounded-2xl bg-slate-950/90 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 text-slate-300 transition-all flex items-center justify-center hover:scale-[1.03] active:scale-95 cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>লগইন নিশ্চিত করুন (Unlock POS)</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer System Specs */}
      <footer className="text-center text-xs text-slate-500 border-t border-slate-800/80 pt-4 max-w-5xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-slate-400" />
          <span>{store.store_name} • 100% Offline POS Solution</span>
        </div>
        <div>
          <span>ডেমো ক্রেডেনশিয়াল: ইউজার <span className="text-slate-300 font-mono">demo</span> | পাসওয়ার্ড <span className="text-amber-400 font-mono">1234</span></span>
        </div>
      </footer>
    </div>
  );
};
