import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Eye,
  EyeOff,
  Delete,
  AlertCircle,
  Grid3X3,
  Store,
  Check,
  X,
  UserCheck,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  SavedLoginAccount,
  findLinkedEmployee,
  getSavedLoginAccounts,
  removeSavedLoginAccount,
} from '../../utils/savedLogins';

const REMEMBER_KEY = 'pos_remembered_login_id';

const AVATAR_TONES = [
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-slate-200 text-slate-700',
];

function getAvatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function getRoleDisplay(role: string): string {
  switch (role) {
    case 'admin':
      return 'Owner';
    case 'manager':
      return 'Manager';
    case 'cashier':
      return 'Salesman';
    case 'visitor':
      return 'Demo';
    default:
      return role;
  }
}

export const LoginScreen: React.FC = () => {
  const { store, users, employees, loginWithPin, setupOwnerAccount } = useApp();

  const needsInitialOwnerSetup = users.length === 0;
  const primaryOwner = useMemo(
    () => users.find((u) => u.role === 'admin' && u.active) || users.find((u) => u.role === 'admin'),
    [users]
  );

  const isDemoAvailable =
    store.demo_mode_enabled !== false &&
    users.some((u) => (u.username === 'demo' || u.role === 'visitor') && u.active);

  const savedIdRaw =
    typeof window !== 'undefined' ? window.localStorage.getItem(REMEMBER_KEY) : null;
  const savedId =
    !isDemoAvailable && savedIdRaw?.toLowerCase() === 'demo' ? null : savedIdRaw;

  const [username, setUsername] = useState<string>(savedId || (isDemoAvailable ? 'demo' : ''));
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(Boolean(savedId));
  const [showForgotHelp, setShowForgotHelp] = useState<boolean>(false);
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // First-time owner setup state (when no users exist in storage)
  const [setupStoreName, setSetupStoreName] = useState<string>(store.store_name || '');
  const [setupOwnerName, setSetupOwnerName] = useState<string>('');
  const [setupAppId, setSetupAppId] = useState<string>('');
  const [setupPin, setSetupPin] = useState<string>('');

  const [savedAccounts, setSavedAccounts] = useState<SavedLoginAccount[]>(() =>
    getSavedLoginAccounts()
  );

  const idInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSavedAccounts(getSavedLoginAccounts());
  }, [users, employees]);

  const visibleSavedAccounts = useMemo(() => {
    return savedAccounts
      .map((acc) => {
        const liveUser = users.find((u) => u.id === acc.userId);
        if (liveUser) {
          if (!liveUser.active) return null;
          if (!isDemoAvailable && liveUser.role === 'visitor') return null;
          const linkedEmp = findLinkedEmployee(liveUser.id, employees);
          return {
            ...acc,
            name: liveUser.name,
            role: liveUser.role,
            appId: liveUser.username,
            employeeId: linkedEmp?.employee_code || acc.employeeId,
            shiftLabel: linkedEmp?.shift_label || acc.shiftLabel,
          };
        }
        return null;
      })
      .filter((item): item is SavedLoginAccount => Boolean(item));
  }, [savedAccounts, users, employees, isDemoAvailable]);

  const selectedSavedAccount = useMemo(() => {
    const cleanCurrent = username.trim().toLowerCase().replace(/^@/, '');
    if (!cleanCurrent) return null;
    return (
      visibleSavedAccounts.find(
        (acc) =>
          acc.appId.toLowerCase() === cleanCurrent ||
          (acc.employeeId && acc.employeeId.toLowerCase() === cleanCurrent)
      ) || null
    );
  }, [visibleSavedAccounts, username]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleNumberPress = (num: string) => {
    if (lockoutSeconds > 0 || isSubmitting) return;
    if (pin.length < 24) {
      setError('');
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    if (lockoutSeconds > 0 || isSubmitting) return;
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setPin('');
  };

  const handleSubmit = async (overrideId?: string, overridePin?: string) => {
    if (isSubmitting || lockoutSeconds > 0) return;
    const targetId = (overrideId !== undefined ? overrideId : username).trim();
    const targetPin = overridePin !== undefined ? overridePin : pin;

    if (!targetId) {
      setError('অনুগ্রহ করে App ID বা Employee ID লিখুন (Please enter App ID or Employee ID)');
      idInputRef.current?.focus();
      return;
    }

    if (!targetPin) {
      setError('অনুগ্রহ করে পাসওয়ার্ড বা পিন দিন (Please enter Password or PIN)');
      passwordInputRef.current?.focus();
      return;
    }

    if (rememberMe) {
      window.localStorage.setItem(REMEMBER_KEY, targetId);
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithPin(targetId, targetPin);
      if (!result.success) {
        if (result.lockedSeconds && result.lockedSeconds > 0) {
          setLockoutSeconds(result.lockedSeconds);
        }
        setError(result.message || 'ভুল আইডি বা পাসওয়ার্ড! (Invalid ID or Password/PIN)');
        setPin('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit();
  };

  const handleOwnerSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const res = await setupOwnerAccount({
        storeName: setupStoreName,
        name: setupOwnerName,
        username: setupAppId,
        pin: setupPin,
      });
      if (!res.success) {
        setError(res.message || 'Could not create owner account.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantDemoLogin = () => {
    if (!isDemoAvailable) return;
    setUsername('demo');
    setPin('1234');
    setError('');
    void handleSubmit('demo', '1234');
  };

  const handleFillOwnerId = () => {
    setUsername(primaryOwner?.username || '');
    setPin('');
    setError('');
    setShowForgotHelp(false);
    setTimeout(() => {
      if (primaryOwner?.username) {
        passwordInputRef.current?.focus();
      } else {
        idInputRef.current?.focus();
      }
    }, 40);
  };

  const handleSelectSavedAccount = (acc: SavedLoginAccount) => {
    setUsername(acc.appId);
    setPin('');
    setError('');
    setTimeout(() => passwordInputRef.current?.focus(), 40);
  };

  const handleRemoveSavedAccount = (userId: string) => {
    const updated = removeSavedLoginAccount(userId);
    setSavedAccounts(updated);
  };

  useEffect(() => {
    if (needsInitialOwnerSetup) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (!isInputFocused) {
        if (e.key >= '0' && e.key <= '9') {
          handleNumberPress(e.key);
        } else if (e.key === 'Backspace') {
          handleBackspace();
        } else if (e.key === 'Enter') {
          void handleSubmit();
        } else if (e.key === 'Escape') {
          handleClear();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, username, rememberMe, needsInitialOwnerSetup]);

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col items-center justify-center p-4 sm:p-8 text-slate-800 antialiased">
      {/* Quiet Store Identity Above Split Card */}
      <div className="flex items-center gap-2.5 mb-5">
        {store.store_logo ? (
          <img
            src={store.store_logo}
            alt={store.store_name}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-white"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#0d6efd] text-white flex items-center justify-center">
            <Store className="w-4 h-4" />
          </div>
        )}
        <div className="text-sm font-semibold text-slate-800 tracking-tight">
          {store.store_name}
        </div>
      </div>

      {/* Centered Clean 2-Column Split Card (Following Reference Layout) */}
      <div className="pos-page-enter w-full max-w-[860px] bg-white rounded-[24px] border border-slate-200/80 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.08)] overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* LEFT COLUMN: Choose an account (All Saved IDs Without Password) */}
        <div className="p-7 sm:p-10 md:border-r md:border-slate-100 border-b md:border-b-0 border-slate-100 flex flex-col">
          <h1 className="text-[20px] sm:text-[22px] font-bold text-slate-900 text-center tracking-tight mb-6">
            Choose an account
          </h1>

          {visibleSavedAccounts.length > 0 ? (
            <div className="flex-1 divide-y divide-slate-100 max-h-[340px] overflow-y-auto pr-1">
              {visibleSavedAccounts.map((acc) => {
                const isSelected = selectedSavedAccount?.userId === acc.userId;
                const initials = acc.name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w.charAt(0).toUpperCase())
                  .join('');

                return (
                  <div
                    key={acc.userId}
                    onClick={() => handleSelectSavedAccount(acc)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectSavedAccount(acc);
                      }
                    }}
                    className={`group flex items-center justify-between gap-3 py-3.5 px-2.5 -mx-2.5 rounded-xl transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/90'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-[#0d6efd] text-white'
                            : getAvatarTone(acc.userId || acc.name)
                        }`}
                      >
                        {initials || acc.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-semibold text-slate-900 truncate">
                            {acc.name}
                          </span>
                        </div>
                        <div className="text-[12.5px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono text-slate-600">@{acc.appId}</span>
                          {acc.employeeId && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{acc.employeeId}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{getRoleDisplay(acc.role)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSavedAccount(acc.userId);
                        }}
                        title="Remove saved account"
                        aria-label={`Remove ${acc.name} from saved accounts`}
                        className="p-1.5 rounded-full text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-80 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
              <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                {needsInitialOwnerSetup ? (
                  <ShieldCheck className="w-5 h-5 text-[#0d6efd]" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {needsInitialOwnerSetup ? 'Fresh Store Terminal' : 'No saved accounts yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[240px]">
                {needsInitialOwnerSetup
                  ? 'নতুন স্টোরের জন্য ডানপাশে আপনার Owner অ্যাকাউন্ট তৈরি করুন। এরপর স্টাফ, সেলসম্যান ও প্রোডাক্ট যোগ করতে পারবেন।'
                  : 'যেসব স্টাফ বা সেলসম্যান লগইন করবে, তাদের আইডি পাসওয়ার্ড ছাড়াই এখানে দেখাবে।'}
              </p>
            </div>
          )}

          <p className="mt-5 pt-3 border-t border-slate-100 text-[11.5px] text-slate-400 text-center">
            IDs saved without password · Zero pre-saved staff or products
          </p>
        </div>

        {/* RIGHT COLUMN: Sign in another account OR First-Time Owner Setup */}
        <div className="p-7 sm:p-10 flex flex-col justify-center">
          {needsInitialOwnerSetup ? (
            <>
              <h2 className="text-[20px] sm:text-[22px] font-bold text-slate-900 text-center tracking-tight mb-6">
                Create Owner account
              </h2>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleOwnerSetupSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="setup-store-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Shop / Store Name
                  </label>
                  <input
                    id="setup-store-name"
                    type="text"
                    value={setupStoreName}
                    onChange={(e) => setSetupStoreName(e.target.value)}
                    placeholder="e.g. Bismillah Super Store"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="setup-owner-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Owner Name
                  </label>
                  <input
                    id="setup-owner-name"
                    type="text"
                    required
                    value={setupOwnerName}
                    onChange={(e) => {
                      setSetupOwnerName(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g. Md. Raihan"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="setup-app-id" className="block text-xs font-medium text-slate-700 mb-1">
                    Owner App ID
                  </label>
                  <input
                    id="setup-app-id"
                    type="text"
                    required
                    value={setupAppId}
                    onChange={(e) => {
                      setSetupAppId(e.target.value.replace(/\s+/g, ''));
                      setError('');
                    }}
                    placeholder="e.g. owner or admin"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="setup-pin" className="block text-xs font-medium text-slate-700 mb-1">
                    Password / PIN (Min 4 characters)
                  </label>
                  <div className="relative">
                    <input
                      id="setup-pin"
                      type={showPin ? 'text' : 'password'}
                      required
                      value={setupPin}
                      onChange={(e) => {
                        setSetupPin(e.target.value);
                        setError('');
                      }}
                      placeholder="Set your login password or PIN"
                      className="w-full h-11 px-3.5 pr-11 rounded-xl border border-transparent bg-[#f1f3f5] focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      aria-label={showPin ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-full bg-[#0d6efd] hover:bg-[#0b5ed7] disabled:opacity-50 active:scale-[0.99] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer mt-2"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Owner & Sign In'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-[20px] sm:text-[22px] font-bold text-slate-900 text-center tracking-tight mb-6">
                {selectedSavedAccount
                  ? `Sign in as ${selectedSavedAccount.name}`
                  : 'Sign in another account'}
              </h2>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* App ID / Employee ID Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="pos-login-id" className="text-xs font-medium text-slate-700">
                      App ID / Employee ID
                    </label>
                    {primaryOwner && (
                      <button
                        type="button"
                        onClick={handleFillOwnerId}
                        className="text-xs font-medium text-[#1a73e8] hover:underline cursor-pointer"
                      >
                        Use Owner ID
                      </button>
                    )}
                  </div>
                  <input
                    ref={idInputRef}
                    id="pos-login-id"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g. @username or EMP-001"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                  />
                </div>

                {/* Password / PIN Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="pos-login-pass" className="text-xs font-medium text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotHelp(!showForgotHelp)}
                      className="text-xs font-medium text-[#1a73e8] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      id="pos-login-pass"
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setError('');
                      }}
                      placeholder="Your password or PIN"
                      className="w-full h-11 px-3.5 pr-11 rounded-xl border border-transparent bg-[#f1f3f5] focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      aria-label={showPin ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {showForgotHelp && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11.5px] text-slate-600 leading-relaxed space-y-1.5">
                    <p>
                      সেলসম্যান পাসওয়ার্ড ভুলে গেলে <strong>Owner / Admin</strong> অ্যাকাউন্ট থেকে লগইন করে{' '}
                      <span className="font-semibold text-slate-900">Staff & Employees</span> মেনু থেকে নতুন পাসওয়ার্ড সেট করতে পারবেন।
                    </p>
                  </div>
                )}

                {/* Primary Pill Sign In CTA matching reference */}
                <button
                  type="submit"
                  disabled={isSubmitting || lockoutSeconds > 0}
                  className="w-full h-11 rounded-full bg-[#0d6efd] hover:bg-[#0b5ed7] disabled:opacity-50 active:scale-[0.99] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer mt-2"
                >
                  {lockoutSeconds > 0
                    ? `Locked (${lockoutSeconds}s)`
                    : isSubmitting
                    ? 'Signing In...'
                    : 'Sign In'}
                </button>
              </form>

              {/* Subtle Bottom Helper Links matching reference footer row */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="inline-flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer py-1"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                      rememberMe
                        ? 'bg-[#0d6efd] border-[#0d6efd] text-white'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {rememberMe && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span>Remember ID</span>
                </button>

                <span aria-hidden="true">·</span>

                <button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  className="inline-flex items-center gap-1 font-medium text-[#1a73e8] hover:underline cursor-pointer py-1"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  <span>{showKeypad ? 'Hide Keypad' : 'PIN Keypad'}</span>
                </button>

                {isDemoAvailable && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={handleInstantDemoLogin}
                      className="inline-flex items-center gap-1 font-medium text-[#1a73e8] hover:underline cursor-pointer py-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Demo Login</span>
                    </button>
                  </>
                )}
              </div>

              {/* Optional Collapsible Touch PIN Keypad */}
              {showKeypad && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleNumberPress(num.toString())}
                        className="h-10 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-[#0d6efd] active:scale-95 font-mono font-bold text-sm text-slate-800 transition-all cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumberPress('0')}
                      className="h-10 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-[#0d6efd] active:scale-95 font-mono font-bold text-sm text-slate-800 transition-all cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      aria-label="Backspace"
                      className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Subtle Store Address Footer */}
      <p className="mt-5 text-[11.5px] text-slate-400 text-center">
        {store.store_address ? `${store.store_address} · ` : ''}Offline Ready
      </p>
    </div>
  );
};
