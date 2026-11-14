import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  Phone,
  Search,
  User,
  Bell,
  Menu,
  X,
  AlertTriangle,
  CreditCard,
  Lock,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Camera,
  Upload,
  Trash2,
  ChevronDown,
  Globe,
  ShoppingCart,
  LogOut,
  WifiOff,
  Clock,
  Printer,
  ShieldAlert,
  BellRing,
  MessageCircle,
  MessageSquare,
} from 'lucide-react';
import { Customer, User as UserType } from '../types';
import { canAccessTab } from '../utils/security';
import { DueAlertModal } from './Customers/DueAlertModal';
import {
  buildDueReminderMessage,
  buildSmsUrl,
  buildWhatsAppUrl,
  isCustomerDueOverdue,
} from '../utils/dueAlerts';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    store,
    activeTab,
    setActiveTab,
    activeUser,
    users,
    cashSessions,
    updateStore,
    loginWithPin,
    requiresPinChange,
    changeOwnPin,
    logout,
    lockTerminal,
    products,
    customers,
    categories,
    heldCarts,
    logDueAlert,
  } = useApp();

  const [timeStr, setTimeStr] = useState<string>('');
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [headerAlertCustomer, setHeaderAlertCustomer] = useState<Customer | null>(null);
  const [showLogoModal, setShowLogoModal] = useState<boolean>(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [pinError, setPinError] = useState<string>('');
  const [isSwitchingUser, setIsSwitchingUser] = useState<boolean>(false);

  // Change default admin PIN modal state
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [changePinError, setChangePinError] = useState<string>('');
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateStore({
        ...store,
        store_logo: reader.result as string,
        receipt_show_logo: true,
      });
      setShowLogoModal(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        }) +
          ' · ' +
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const openCashSession = cashSessions.find((s) => s.status === 'open');
  const lowStockItems = products
    .flatMap((p) => p.variants)
    .filter((v) => v.stock_quantity <= v.min_stock_level);
  const dueCustomers = customers.filter((c) => (c.total_due_amount || 0) > 0);
  const totalAlerts = lowStockItems.length + (dueCustomers.length > 0 ? 1 : 0);

  const handleSwitchUserClick = (u: UserType) => {
    setSelectedUser(u);
    setEnteredPin('');
    setPinError('');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSwitchingUser) return;
    setIsSwitchingUser(true);
    setPinError('');
    try {
      const result = await loginWithPin(selectedUser.username, enteredPin);
      if (result.success) {
        setShowUserModal(false);
        setSelectedUser(null);
        setEnteredPin('');
        setPinError('');
      } else {
        setPinError(result.message || 'Invalid Password / PIN. Please try again.');
        setEnteredPin('');
      }
    } finally {
      setIsSwitchingUser(false);
    }
  };

  const handleAdminPinChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError('');
    if (newPinInput.trim().length < 4) {
      setChangePinError('নতুন পাসওয়ার্ড/পিন কমপক্ষে ৪ অক্ষরের হতে হবে (Minimum 4 characters).');
      return;
    }
    if (newPinInput.trim() === '1234') {
      setChangePinError('নিরাপত্তার জন্য 1234 ব্যবহার করা যাবে না। ভিন্ন শক্তিশালী পিন দিন।');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setChangePinError('নতুন পাসওয়ার্ড দুটি মেলেনি (Passwords do not match).');
      return;
    }
    setIsChangingPin(true);
    try {
      const res = await changeOwnPin(currentPinInput, newPinInput);
      if (!res.success) {
        setChangePinError(res.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি।');
        return;
      }
      setShowChangePinModal(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
    } finally {
      setIsChangingPin(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = store.language === 'en' ? 'bn' : 'en';
    updateStore({ ...store, language: newLang });
  };

  const mainNavLinks = [
    { id: 'dashboard', label: 'HOME' },
    { id: 'pos', label: 'POS SHOP' },
    { id: 'products', label: 'PRODUCTS' },
    { id: 'inventory', label: 'INVENTORY' },
    { id: 'customers', label: 'CUSTOMERS' },
    { id: 'sales', label: 'SALES' },
  ].filter((l) => canAccessTab(activeUser, l.id));

  const moreModules = [
    { id: 'purchases', label: 'Purchases & Stock In' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'customer_due', label: 'Customer Due Ledger' },
    { id: 'returns', label: 'Returns & Exchange' },
    { id: 'expenses', label: 'Shop Expenses' },
    { id: 'cash', label: 'Cash Drawer & Shift' },
    { id: 'quotations', label: 'Quotations' },
    { id: 'reports', label: 'Reports & P/L' },
    { id: 'users', label: 'Salesman & Users' },
    { id: 'settings', label: 'Store Settings' },
    { id: 'backup', label: 'Backup & Restore' },
    { id: 'drive', label: 'Google Drive Sync' },
    { id: 'audit', label: 'Audit Logs' },
  ].filter((m) => canAccessTab(activeUser, m.id));

  const isMoreActive = moreModules.some((m) => m.id === activeTab);

  return (
    <header className="w-full sticky top-0 z-30 no-print select-none bg-white shadow-xs">
      {/* Default Admin PIN Security Warning Banner */}
      {requiresPinChange && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                সতর্কতা: অ্যাডমিন অ্যাকাউন্ট এখনও ডিফল্ট পিন (1234) ব্যবহার করছে। নিরাপত্তার জন্য এখনই পিন পরিবর্তন করুন।
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowChangePinModal(true);
                setChangePinError('');
              }}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer"
            >
              Change Admin PIN Now
            </button>
          </div>
        </div>
      )}
      {/* 1. Deep Royal Purple Top Announcement Bar (Matching reference #5b46b5) */}
      <div className="bg-[#5b46b5] text-white text-[11px] px-4 sm:px-6 lg:px-8 py-1.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <WifiOff className="w-3 h-3 text-pink-300" />
              <span>100% Offline Grocery POS</span>
            </span>
            <button
              onClick={() => setActiveTab('cash')}
              className="hidden sm:inline-flex items-center gap-1.5 hover:text-pink-200 transition-colors cursor-pointer"
            >
              <Clock className="w-3 h-3 text-pink-300" />
              <span>
                Shift:{' '}
                {openCashSession
                  ? `Active (${store.currency_symbol}${openCashSession.opening_cash.toLocaleString()})`
                  : 'Closed'}
              </span>
            </button>
            <span className="hidden md:inline-flex items-center gap-1.5 text-white/90">
              <Printer className="w-3 h-3 text-pink-300" />
              <span>{store.receipt_size} Thermal Ready</span>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-white/90 hover:text-white cursor-pointer"
              title="Switch Language"
            >
              <Globe className="w-3 h-3" />
              <span>{store.language === 'en' ? 'EN' : 'বাংলা'}</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-1 font-mono text-white/95">
              <Phone className="w-3 h-3 text-pink-300" />
              <span>{store.store_phone || '+880 1700-000000'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Crisp White Main Navigation Bar */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          {/* Brand Lockup with Hot-Pink Shopping Bag Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowLogoModal(true)}
              className="flex items-center gap-2.5 group cursor-pointer text-left min-w-0"
              title="Click to customize shop logo"
            >
              <div className="w-10 h-10 rounded-xl bg-[#ec1f73] text-white flex items-center justify-center shadow-sm overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                {store.store_logo ? (
                  <img
                    src={store.store_logo}
                    alt={store.store_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-base sm:text-lg text-[#1e1b3a] tracking-tight truncate">
                  {store.store_name}
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[240px]">
                  {store.store_address || 'Smart Grocery & Retail Store'}
                </div>
              </div>
            </button>
          </div>

          {/* Center Horizontal Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold tracking-wide">
            {mainNavLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setActiveTab(link.id);
                    setShowMoreDropdown(false);
                  }}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-[#ec1f73] border-[#ec1f73]'
                      : 'text-slate-600 border-transparent hover:text-[#ec1f73]'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}

            {/* All Modules Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                className={`py-1.5 border-b-2 inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isMoreActive || showMoreDropdown
                    ? 'text-[#ec1f73] border-[#ec1f73]'
                    : 'text-slate-600 border-transparent hover:text-[#ec1f73]'
                }`}
              >
                <span>MORE</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showMoreDropdown && (
                <div className="absolute left-0 top-full mt-3 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 space-y-0.5">
                  {moreModules.map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() => {
                        setActiveTab(mod.id);
                        setShowMoreDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activeTab === mod.id
                          ? 'bg-[#ec1f73] text-white'
                          : 'text-slate-700 hover:bg-pink-50 hover:text-[#ec1f73]'
                      }`}
                    >
                      {mod.label}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 my-1 pt-1 flex items-center justify-between px-2 py-1">
                    <button
                      onClick={() => {
                        setShowMoreDropdown(false);
                        lockTerminal();
                      }}
                      className="text-[11px] font-semibold text-slate-600 hover:text-[#5b46b5] flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Lock</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreDropdown(false);
                        logout();
                      }}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Icons (Search, Alerts, User, Cart) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('products')}
              className="hidden sm:flex w-9 h-9 rounded-full hover:bg-slate-100 text-slate-600 items-center justify-center transition-colors cursor-pointer"
              title="Search Catalog"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationModal(!showNotificationModal)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer relative"
                title="Alerts & Stock Warnings"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ec1f73] text-white text-[9px] font-bold flex items-center justify-center">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {showNotificationModal && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-[#ec1f73]" />
                      <span>Store & Due Customer Alerts</span>
                    </span>
                    <button
                      onClick={() => setShowNotificationModal(false)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5">
                    {lowStockItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotificationModal(false);
                          setActiveTab('inventory');
                        }}
                        className="w-full text-left p-3 bg-rose-50 hover:bg-rose-100/80 rounded-xl border border-rose-100 flex items-start gap-2.5 transition-colors cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-[#ec1f73] shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-rose-900 block">Low Stock Warning</span>
                          <span className="text-rose-700 text-[11px]">
                            {lowStockItems.length} product variants are below reorder threshold.
                          </span>
                        </div>
                      </button>
                    )}

                    {dueCustomers.length > 0 && (
                      <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                              <span className="font-bold text-amber-950 block">
                                Due Customer Alerts ({dueCustomers.length})
                              </span>
                              <span className="text-amber-800 text-[10px]">
                                Send instant SMS, WhatsApp or reminder alert
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNotificationModal(false);
                              setActiveTab('customer_due');
                            }}
                            className="text-[10px] font-bold text-[#5b46b5] hover:underline cursor-pointer shrink-0"
                          >
                            View All →
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {[...dueCustomers]
                            .sort((a, b) => (b.total_due_amount || 0) - (a.total_due_amount || 0))
                            .slice(0, 4)
                            .map((dc) => {
                              const overdue = isCustomerDueOverdue(
                                dc,
                                store.due_alert_days || 7
                              ).overdue;
                              const msg = buildDueReminderMessage({
                                customer: dc,
                                store,
                                lang: store.language === 'bn' ? 'bn' : 'both',
                              });
                              return (
                                <div
                                  key={dc.id}
                                  className="p-2 bg-white rounded-xl border border-amber-200/70 flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-slate-900 truncate flex items-center gap-1">
                                      <span>{dc.name}</span>
                                      {overdue && (
                                        <span className="px-1 py-0.5 rounded bg-rose-100 text-rose-700 text-[8px] uppercase font-extrabold">
                                          OVERDUE
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono text-rose-700 font-bold">
                                      Due: {store.currency_symbol}
                                      {dc.total_due_amount.toLocaleString()} · {dc.mobile}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <a
                                      href={buildWhatsAppUrl(dc.mobile, msg)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => logDueAlert(dc.id, 'whatsapp', 'Bell popover alert')}
                                      title="Send WhatsApp Alert"
                                      className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </a>
                                    <a
                                      href={buildSmsUrl(dc.mobile, msg)}
                                      onClick={() => logDueAlert(dc.id, 'sms', 'Bell popover SMS')}
                                      title="Send SMS Alert"
                                      className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowNotificationModal(false);
                                        setHeaderAlertCustomer(dc);
                                      }}
                                      title="All Alert Options (Call / Email / Edit)"
                                      className="w-7 h-7 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white flex items-center justify-center cursor-pointer"
                                    >
                                      <BellRing className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {totalAlerts === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        All stock and dues are balanced.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Switcher */}
            <button
              onClick={() => {
                setShowUserModal(true);
                setSelectedUser(activeUser);
              }}
              className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title={`Active: ${activeUser.name} (@${activeUser.username})`}
            >
              <div className="w-8 h-8 rounded-full bg-[#5b46b5] text-white flex items-center justify-center text-xs font-bold">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden xl:inline text-xs font-semibold text-slate-700 max-w-[90px] truncate">
                {activeUser.name.split(' ')[0]}
              </span>
            </button>

            {/* POS Bag Trigger */}
            <button
              onClick={() => setActiveTab('pos')}
              className="relative w-9 h-9 rounded-full hover:bg-pink-50 text-slate-700 hover:text-[#ec1f73] flex items-center justify-center transition-colors cursor-pointer"
              title="Open POS Terminal"
            >
              <ShoppingCart className="w-4 h-4" />
              {heldCarts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ec1f73] text-white text-[9px] font-bold flex items-center justify-center">
                  {heldCarts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Secondary Category & Hot-Pink Action Strip (Matching reference) */}
      <div className="hidden md:block bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 overflow-x-auto text-[11px] font-semibold text-slate-500 whitespace-nowrap">
            {categories.slice(0, 7).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab('pos')}
                className="hover:text-[#ec1f73] transition-colors uppercase tracking-wider cursor-pointer"
              >
                {cat.name.split(' (')[0]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-mono text-slate-400">{timeStr}</span>
            <button
              onClick={() => setActiveTab(activeTab === 'pos' ? 'cash' : 'pos')}
              className="px-4 py-1.5 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white text-[11px] font-bold tracking-wide shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              {activeTab === 'pos' ? 'CASH DRAWER SHIFT' : 'OPEN POS TERMINAL'}
            </button>
          </div>
        </div>
      </div>

      {/* User Switch Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#ec1f73]" />
                <h3 className="text-base font-bold text-slate-800">Switch Active Salesman / Cashier</h3>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select staff member and enter Password / PIN to switch terminal authorization.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {users.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                const isActiveNow = activeUser.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUserClick(u)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-pink-50 border-[#ec1f73] text-slate-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#5b46b5]/10 border border-[#5b46b5]/20 flex items-center justify-center font-bold text-sm text-[#5b46b5]">
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
                        <div className="text-xs text-slate-500 capitalize flex items-center gap-1.5">
                          <span>{u.role}</span>
                          <span className="text-[#5b46b5] font-mono lowercase">@{u.username}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && <ShieldCheck className="w-5 h-5 text-[#ec1f73]" />}
                  </button>
                );
              })}
            </div>

            {selectedUser && (
              <form onSubmit={handlePinSubmit} className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Password / PIN for {selectedUser.name} (@{selectedUser.username}):
                  </label>
                  <input
                    type="password"
                    maxLength={24}
                    autoFocus
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    placeholder="Enter Password or PIN"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-center text-lg tracking-widest font-mono text-[#5b46b5] focus:outline-none focus:border-[#ec1f73]"
                  />
                  {pinError && <p className="text-xs text-rose-600 mt-1 font-medium">{pinError}</p>}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#ec1f73] hover:bg-[#d61665] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
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

      {/* Shop Logo Upload Modal */}
      {showLogoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#ec1f73] text-white flex items-center justify-center shadow-sm">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Shop Logo Management</h3>
                  <p className="text-xs text-slate-500">দোকানের লোগো আপলোড বা পরিবর্তন করুন</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogoModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="w-24 h-24 rounded-2xl bg-white border-2 border-slate-300 shadow-md flex items-center justify-center overflow-hidden">
                {store.store_logo ? (
                  <img
                    src={store.store_logo}
                    alt={store.store_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#ec1f73] text-white flex items-center justify-center font-black text-3xl">
                    {store.store_name.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-slate-700">{store.store_name}</span>
            </div>

            <div className="space-y-2">
              <label className="w-full py-3 px-4 bg-[#ec1f73] hover:bg-[#d61665] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>নতুন লোগো আপলোড করুন (Upload Image File)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>

              {store.store_logo && (
                <button
                  type="button"
                  onClick={() => {
                    updateStore({ ...store, store_logo: undefined });
                    setShowLogoModal(false);
                  }}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>লোগো মুছে ফেলুন (Remove Custom Logo)</span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="px-5 py-2 bg-[#5b46b5] hover:bg-[#4b389b] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory/Quick Change Default Admin PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Change Owner Admin PIN</h3>
                  <p className="text-[11px] text-slate-500">ডিফল্ট পিন (1234) পরিবর্তন করে নিরাপদ পাসওয়ার্ড দিন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePinModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {changePinError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {changePinError}
              </div>
            )}

            <form onSubmit={handleAdminPinChangeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current PIN / Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  placeholder="Enter current PIN (e.g. 1234)"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Custom Password / PIN (min 4 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={24}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Enter strong new PIN or password"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password / PIN
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={24}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="Re-enter new PIN or password"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Later
                </button>
                <button
                  type="submit"
                  disabled={isChangingPin}
                  className="px-5 py-2 bg-[#5b46b5] hover:bg-[#4b389b] disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isChangingPin ? 'Saving...' : 'Update PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DUE ALERT MODAL TRIGGERED FROM HEADER */}
      {headerAlertCustomer && (
        <DueAlertModal
          customer={headerAlertCustomer}
          onClose={() => setHeaderAlertCustomer(null)}
        />
      )}
    </header>
  );
};
