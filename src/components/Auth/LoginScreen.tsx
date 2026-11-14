import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Eye,
  EyeOff,
  Delete,
  AlertCircle,
  Sparkles,
  Grid3X3,
  ShieldCheck,
  Store,
  Check,
  KeyRound,
  UserCheck,
  ChevronRight,
  Copy,
} from 'lucide-react';

const REMEMBER_KEY = 'pos_remembered_login_id';

export const LoginScreen: React.FC = () => {
  const { store, users, loginWithPin } = useApp();

  const isDemoAvailable =
    store.demo_mode_enabled !== false &&
    users.some((u) => (u.username === 'demo' || u.role === 'visitor') && u.active);

  const savedId =
    typeof window !== 'undefined' ? window.localStorage.getItem(REMEMBER_KEY) : null;

  const [username, setUsername] = useState<string>(savedId || (isDemoAvailable ? 'demo' : ''));
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(Boolean(savedId));
  const [showForgotHelp, setShowForgotHelp] = useState<boolean>(false);
  const [showMobileKeypad, setShowMobileKeypad] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [copiedDemo, setCopiedDemo] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<'id' | 'pass' | null>('id');

  const passwordInputRef = useRef<HTMLInputElement | null>(null);

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
      setError('অনুগ্রহ করে ইউজার বা সেলসম্যান আইডি লিখুন (Please enter User / Salesman ID)');
      return;
    }

    if (!targetPin) {
      setError('অনুগ্রহ করে পাসওয়ার্ড বা পিন দিন (Please enter Password / PIN)');
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

  const handleInstantDemoLogin = () => {
    if (!isDemoAvailable) return;
    setUsername('demo');
    setPin('1234');
    setError('');
    void handleSubmit('demo', '1234');
  };

  const handleFillOwnerId = () => {
    setUsername('admin');
    setPin('');
    setError('');
    setShowForgotHelp(false);
    setTimeout(() => passwordInputRef.current?.focus(), 40);
  };

  const handleCopyDemo = () => {
    if (!isDemoAvailable) return;
    navigator.clipboard?.writeText('ID: demo | PIN: 1234');
    setCopiedDemo(true);
    setTimeout(() => setCopiedDemo(false), 1800);
  };

  useEffect(() => {
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
          handleSubmit();
        } else if (e.key === 'Escape') {
          handleClear();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, username, rememberMe]);

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center p-4 sm:p-6 lg:p-10 text-slate-800 antialiased">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* LEFT COLUMN: Signature Clean White Login Card matching reference */}
        <div className="lg:col-span-6 w-full max-w-[440px] mx-auto">
          <div className="bg-white rounded-[32px] p-7 sm:p-10 shadow-[0_24px_60px_-15px_rgba(32,28,86,0.12)] border border-slate-100/90 transition-all">
            {/* Subtle Store Brand Mark */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {store.store_logo ? (
                <img
                  src={store.store_logo}
                  alt={store.store_name}
                  className="w-8 h-8 rounded-xl object-cover shadow-xs border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-[#201c56] text-white flex items-center justify-center font-bold text-sm">
                  {store.store_name?.charAt(0) || 'R'}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-500 tracking-tight truncate max-w-[220px]">
                {store.store_name}
              </span>
            </div>

            {/* Hero Headline & Subtitle */}
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#201c56] tracking-tight leading-[1.15] text-balance">
                Login to your
                <br />
                account.
              </h1>
              <p className="text-[13px] text-slate-400 font-normal">
                Hello, welcome back to your account
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Main Form with Notched Floating-Label Inputs */}
            <form onSubmit={handleFormSubmit} className="space-y-5">
              {/* Input 1: Salesman / User ID */}
              <div className="relative">
                <label
                  htmlFor="pos-login-id"
                  className={`absolute -top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-medium transition-colors z-10 ${
                    focusedField === 'id' ? 'text-[#6666f1]' : 'text-slate-400'
                  }`}
                >
                  Salesman / User ID
                </label>
                <input
                  id="pos-login-id"
                  type="text"
                  value={username}
                  onFocus={() => setFocusedField('id')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="demo or salesman id"
                  className={`w-full h-13 px-4 rounded-xl border-[1.5px] bg-white text-sm text-slate-800 placeholder-slate-300 outline-none transition-all ${
                    focusedField === 'id'
                      ? 'border-[#6666f1] ring-4 ring-[#6666f1]/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                />
              </div>

              {/* Input 2: Password / PIN */}
              <div className="relative">
                <label
                  htmlFor="pos-login-pass"
                  className={`absolute -top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-medium transition-colors z-10 ${
                    focusedField === 'pass' ? 'text-[#6666f1]' : 'text-slate-400'
                  }`}
                >
                  Password / PIN
                </label>
                <input
                  ref={passwordInputRef}
                  id="pos-login-pass"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError('');
                  }}
                  placeholder="Your Password or PIN"
                  className={`w-full h-13 px-4 pr-12 rounded-xl border-[1.5px] bg-white text-sm text-slate-800 placeholder-slate-300 outline-none transition-all ${
                    focusedField === 'pass'
                      ? 'border-[#6666f1] ring-4 ring-[#6666f1]/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  aria-label={showPin ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Remember me & Forgot Password row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer py-1"
                >
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      rememberMe
                        ? 'border-[#6666f1] bg-[#6666f1] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {rememberMe && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span>Remember me</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotHelp(!showForgotHelp)}
                  className="text-slate-400 hover:text-[#6666f1] font-medium transition-colors cursor-pointer py-1"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Forgot Password Inline Helper */}
              {showForgotHelp && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-2">
                  <p className="leading-relaxed">
                    সেলসম্যান পাসওয়ার্ড ভুলে গেলে <strong>Owner / Admin</strong> অ্যাকাউন্ট থেকে লগইন করে{' '}
                    <span className="font-semibold text-[#201c56]">Salesman & Users</span> মেনু থেকে নতুন পাসওয়ার্ড সেট করতে পারবেন।
                  </p>
                  {isDemoAvailable && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
                      <span className="font-mono text-slate-500">Demo: demo / 1234</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUsername('demo');
                          setPin('1234');
                          setShowForgotHelp(false);
                        }}
                        className="text-[#6666f1] font-bold hover:underline cursor-pointer"
                      >
                        Auto-fill Demo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Periwinkle Login CTA */}
              <button
                type="submit"
                disabled={isSubmitting || lockoutSeconds > 0}
                className="w-full h-13 rounded-xl bg-[#6666f1] hover:bg-[#5555e6] disabled:opacity-50 active:scale-[0.99] text-white font-semibold text-sm shadow-[0_12px_24px_-8px_rgba(102,102,241,0.5)] transition-all cursor-pointer"
              >
                {lockoutSeconds > 0
                  ? `Locked (${lockoutSeconds}s)`
                  : isSubmitting
                  ? 'Verifying...'
                  : 'Login'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-slate-200/80" />
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                or quick access with
              </span>
              <div className="h-px flex-1 bg-slate-200/80" />
            </div>

            {/* Clean Action Cards matching reference bottom row */}
            <div className={`grid gap-3 ${isDemoAvailable ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {isDemoAvailable && (
                <button
                  type="button"
                  onClick={handleInstantDemoLogin}
                  title="1-Click Demo Login (ID: demo, PIN: 1234)"
                  className="h-12 rounded-xl border border-slate-200 bg-white hover:border-[#6666f1]/50 hover:bg-indigo-50/40 active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-semibold text-[#201c56] transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#6666f1]" />
                  <span>Demo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowMobileKeypad(!showMobileKeypad)}
                title="Toggle Touch PIN Keypad"
                className={`h-12 rounded-xl border active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  showMobileKeypad
                    ? 'border-[#6666f1] bg-indigo-50 text-[#6666f1]'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span>Keypad</span>
              </button>

              <button
                type="button"
                onClick={handleFillOwnerId}
                title="Fill Owner Admin ID"
                className="h-12 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Owner</span>
              </button>
            </div>

            {/* Collapsible Touch Keypad (especially useful on Mobile / Tablet or when clicked) */}
            {showMobileKeypad && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberPress(num.toString())}
                      className="h-11 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-[#6666f1] active:scale-95 border border-slate-200/80 font-mono font-bold text-base text-[#201c56] transition-all cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-11 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-100 transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberPress('0')}
                    className="h-11 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-[#6666f1] active:scale-95 border border-slate-200/80 font-mono font-bold text-base text-[#201c56] transition-all cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    aria-label="Backspace"
                    className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Quiet Unboxed Footer Metadata */}
            <div className="mt-6 text-center text-[11px] text-slate-400">
              {isDemoAvailable ? (
                <>
                  <span>Demo ID: </span>
                  <span className="font-mono font-semibold text-slate-600">demo</span>
                  <span className="mx-1.5">·</span>
                  <span>PIN: </span>
                  <span className="font-mono font-semibold text-slate-600">1234</span>
                </>
              ) : (
                <span>PBKDF2-SHA256 & AES-GCM Encrypted Terminal</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Companion Store Overview & Touch Keypad (Desktop only, mirrors right screen of reference) */}
        <div className="hidden lg:block lg:col-span-6 w-full max-w-[440px] mx-auto">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_24px_60px_-15px_rgba(32,28,86,0.08)] border border-slate-100/90 space-y-6">
            {/* Greeting Header matching right phone card in reference */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400 font-medium">Howdy,</p>
                <h2 className="text-2xl font-extrabold text-[#201c56] tracking-tight truncate max-w-[260px]">
                  {store.store_name}
                </h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#201c56] text-white flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden shrink-0">
                {store.store_logo ? (
                  <img
                    src={store.store_logo}
                    alt={store.store_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Dual Gradient Feature Cards matching reference aesthetic */}
            <div className="grid grid-cols-2 gap-3.5">
              {isDemoAvailable ? (
                <button
                  type="button"
                  onClick={handleInstantDemoLogin}
                  className="text-left p-4 rounded-2xl bg-gradient-to-br from-[#0095ff] to-[#00c6ff] text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <UserCheck className="w-4 h-4 text-white/90" />
                    <ChevronRight className="w-4 h-4 text-white/80" />
                  </div>
                  <div className="text-lg font-extrabold font-mono tabular-nums">demo / 1234</div>
                  <div className="text-[11px] text-white/90 mt-0.5">1-Click Demo Login</div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFillOwnerId}
                  className="text-left p-4 rounded-2xl bg-gradient-to-br from-[#0095ff] to-[#00c6ff] text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <ShieldCheck className="w-4 h-4 text-white/90" />
                    <ChevronRight className="w-4 h-4 text-white/80" />
                  </div>
                  <div className="text-lg font-extrabold font-mono tabular-nums">Owner Login</div>
                  <div className="text-[11px] text-white/90 mt-0.5">Demo Disabled (Production)</div>
                </button>
              )}

              <button
                type="button"
                onClick={isDemoAvailable ? handleCopyDemo : handleFillOwnerId}
                className="text-left p-4 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#f43f5e] text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <KeyRound className="w-4 h-4 text-white/90" />
                  {copiedDemo ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/80" />
                  )}
                </div>
                <div className="text-lg font-extrabold">Salesman ID</div>
                <div className="text-[11px] text-white/90 mt-0.5">
                  {copiedDemo ? 'Demo credentials copied' : 'ID & Password Supported'}
                </div>
              </button>
            </div>

            {/* Quick Touch PIN Pad */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#201c56]">Quick Touch PIN Pad</span>
                <span className="font-mono text-slate-400">
                  ID: <strong className="text-slate-700">{username.trim() || 'demo'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumberPress(num.toString())}
                    className="h-12 rounded-2xl bg-[#f4f6fb] hover:bg-indigo-50 hover:text-[#6666f1] active:scale-95 font-mono font-bold text-lg text-[#201c56] transition-all cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-12 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-all cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleNumberPress('0')}
                  className="h-12 rounded-2xl bg-[#f4f6fb] hover:bg-indigo-50 hover:text-[#6666f1] active:scale-95 font-mono font-bold text-lg text-[#201c56] transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Backspace"
                  className="h-12 rounded-2xl bg-[#f4f6fb] hover:bg-slate-200/70 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quiet Store Location & Offline Note */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate max-w-[240px]">
                {store.store_address || 'Smart Grocery POS Terminal'}
              </span>
              <span>Offline Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
