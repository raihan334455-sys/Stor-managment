import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  User,
  Bell,
  LayoutGrid,
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
  Globe,
  ShoppingCart,
  ShieldAlert,
  BellRing,
  MessageCircle,
  MessageSquare,
  CloudUpload,
  ArrowLeft,
  Database,
  Clock,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Store,
} from 'lucide-react';
import { Customer, User as UserType } from '../types';
import { canAccessTab } from '../utils/security';
import { DueAlertModal } from './Customers/DueAlertModal';
import { QuickDriveUpdateModal } from './GoogleDrive/QuickDriveUpdateModal';
import { QuickCloudSyncModal } from './CloudSync/QuickCloudSyncModal';
import {
  buildDueReminderMessage,
  buildSmsUrl,
  buildWhatsAppUrl,
  isCustomerDueOverdue,
} from '../utils/dueAlerts';
import {
  isDemoModeEnabled,
  isProductEnabled,
} from '../utils/modules';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onToggleTabletSidebar: () => void;
}

const TAB_LABELS: Record<string, { en: string; bn: string }> = {
  dashboard: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  pos: { en: 'POS Terminal', bn: 'POS বিলিং' },
  products: { en: 'All Products & Bulk', bn: 'সকল পণ্য ও বাল্ক' },
  medicine: { en: 'Medicine Management', bn: 'ওষুধ ব্যবস্থাপনা' },
  general_products: { en: 'General Products', bn: 'সাধারণ পণ্য' },
  inventory: { en: 'Inventory & Stock', bn: 'স্টক ও ইনভেন্টরি' },
  personal_use: { en: 'Personal Use & Stock', bn: 'ব্যক্তিগত ব্যবহার' },
  stock_adjustment: { en: 'Stock Adjustment', bn: 'স্টক অ্যাডজাস্টমেন্ট' },
  damaged_stock: { en: 'Damaged & Expired', bn: 'নষ্ট ও মেয়াদোত্তীর্ণ' },
  barcode: { en: 'Barcode Center', bn: 'বারকোড প্রিন্ট' },
  customers: { en: 'Customers', bn: 'কাস্টমার' },
  customer_due: { en: 'Customer Due Ledger', bn: 'কাস্টমার বাকি খাতা' },
  receipts: { en: 'Payment Receipts', bn: 'পেমেন্ট রশিদ' },
  sales: { en: 'Sales & Invoices', bn: 'বিক্রয় ইতিহাস' },
  purchases: { en: 'Purchases', bn: 'ক্রয় হিসাব' },
  suppliers: { en: 'Suppliers', bn: 'সাপ্লায়ার' },
  supplier_due: { en: 'Supplier Due Ledger', bn: 'সাপ্লায়ার বাকি খাতা' },
  returns: { en: 'Returns & Exchange', bn: 'রিটার্ন' },
  accounts: { en: 'Accounts Management', bn: 'অ্যাকাউন্টস' },
  expenses: { en: 'Shop Expenses', bn: 'দোকানের খরচ' },
  cash: { en: 'Cash Drawer & Shift', bn: 'ক্যাশ ড্রয়ার' },
  employees: { en: 'Staff, Employees & Salesman', bn: 'স্টাফ, কর্মচারী ও সেলসম্যান' },
  quotations: { en: 'Quotations', bn: 'কোটেশন' },
  reports: { en: 'Reports & P/L', bn: 'রিপোর্টস' },
  users: { en: 'Salesman Login & Roles', bn: 'সেলসম্যান লগইন ও রোল' },
  settings: { en: 'Store Settings', bn: 'সেটিংস' },
  backup: { en: 'Backup & Cloud Sync', bn: 'ব্যাকআপ ও ক্লাউড' },
  drive: { en: 'Google Drive Sync', bn: 'গুগল ড্রাইভ' },
  audit: { en: 'Activity Logs', bn: 'অ্যাক্টিভিটি লগ' },
};

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onToggleTabletSidebar,
}) => {
  const {
    store,
    activeTab,
    setActiveTab,
    canGoBack,
    goBack,
    activeUser,
    users,
    employees,
    cashSessions,
    updateStore,
    loginWithPin,
    requiresPinChange,
    changeOwnPin,
    products,
    customers,
    heldCarts,
    logDueAlert,
  } = useApp();

  const activeEmployee = employees.find(
    (e) => e.linked_user_id === activeUser.id && e.active
  );

  const isBn = store.language === 'bn';
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [headerAlertCustomer, setHeaderAlertCustomer] = useState<Customer | null>(null);
  const [showLogoModal, setShowLogoModal] = useState<boolean>(false);
  const [showDriveUpdateModal, setShowDriveUpdateModal] = useState<boolean>(false);
  const [showFirestoreModal, setShowFirestoreModal] = useState<boolean>(false);
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
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setDateStr(
        now.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, [isBn]);

  const demoEnabled = isDemoModeEnabled(store);
  const openCashSession = cashSessions.find((s) => s.status === 'open');
  const lowStockItems = products
    .filter((p) => !p.archived && isProductEnabled(p, store))
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

  const currentTabInfo = TAB_LABELS[activeTab] || { en: 'Overview', bn: 'ড্যাশবোর্ড' };

  return (
    <header className="w-full shrink-0 sticky top-0 z-30 no-print select-none bg-gradient-to-r from-[#091f46] via-[#0d3577] to-[#0b56b8] text-white border-b border-[#164a94] shadow-sm">
      {/* Default Admin PIN Security Warning Banner */}
      {requiresPinChange && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-6 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate sm:whitespace-normal">
                {isBn
                  ? 'সতর্কতা: অ্যাডমিন অ্যাকাউন্ট এখনও ডিফল্ট পিন (1234) ব্যবহার করছে।'
                  : 'Security Notice: Admin account is still using default PIN (1234).'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowChangePinModal(true);
                setChangePinError('');
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] cursor-pointer shrink-0"
            >
              {isBn ? 'পিন পরিবর্তন' : 'Change PIN'}
            </button>
          </div>
        </div>
      )}

      {/* 3-LINE MEDIUM FULL SHOP INFORMATION HEADER */}
      <div className="w-full px-3 sm:px-5 lg:px-6 divide-y divide-white/10">
        {/* LINE 1: Top Action Bar + Shop Identity (Clean Grid trigger on <lg, Shop Logo + Title inline on lg+) */}
        <div className="py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Mobile Grid Menu Trigger */}
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              aria-label="Open grid menu"
            >
              <LayoutGrid className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="hidden sm:inline text-xs font-bold">{isBn ? 'মেনু' : 'Menu'}</span>
            </button>

            {/* Tablet Grid Menu Trigger */}
            <button
              type="button"
              onClick={onToggleTabletSidebar}
              className="hidden md:inline-flex lg:hidden h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 items-center gap-1.5 cursor-pointer shrink-0"
              aria-label="Open navigation grid menu"
            >
              <LayoutGrid className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="text-xs font-bold">{isBn ? 'মেনু' : 'Menu'}</span>
            </button>

            {/* Global Back Arrow Button (always visible in 2nd position on Computer view lg+) */}
            <button
              type="button"
              onClick={goBack}
              disabled={!canGoBack}
              className={`${
                canGoBack
                  ? 'inline-flex hover:bg-white/25 cursor-pointer'
                  : 'hidden lg:inline-flex opacity-50 cursor-not-allowed'
              } h-8 sm:h-9 px-2 sm:px-3 rounded-xl border border-white/25 bg-white/15 text-white text-xs font-bold items-center gap-1.5 transition-colors shrink-0`}
              title={
                canGoBack
                  ? isBn
                    ? 'পেছনের পেজে যান'
                    : 'Go Back'
                  : isBn
                  ? 'ড্যাশবোর্ড হোম'
                  : 'Dashboard Home'
              }
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{isBn ? 'পেছনে' : 'Back'}</span>
            </button>

            {/* Desktop Shop Logo + Shop Name & Mode */}
            <div className="hidden lg:flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setShowLogoModal(true)}
                className="w-9 h-9 rounded-xl bg-emerald-500 text-white border border-white/25 hover:border-white/50 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-xs transition-colors"
                title={isBn ? 'দোকানের লোগো পরিবর্তন করুন' : 'Customize Shop Logo'}
              >
                {store.store_logo ? (
                  <img
                    src={store.store_logo}
                    alt={store.store_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )}
              </button>

              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <h1 className="font-extrabold text-base text-white truncate max-w-md">
                  {store.store_name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-300/35 text-emerald-100 text-[10px] font-bold shrink-0">
                  {store.business_mode === 'pharmacy'
                    ? isBn
                      ? 'ফার্মেসি'
                      : 'Pharmacy'
                    : store.business_mode === 'general_shop'
                    ? isBn
                      ? 'জেনারেল শপ'
                      : 'General Shop'
                    : isBn
                    ? 'ফার্মেসি ও সুপার শপ'
                    : 'Pharmacy & Super Shop'}
                </span>
                {store.receipt_header && (
                  <span className="hidden xl:inline text-[11px] text-sky-200 truncate max-w-xs">
                    · {store.receipt_header}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Actions (Language, Firestore Sync, Google Drive, Alerts, User, POS) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
            title="Switch Language (English / বাংলা)"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-300" />
            <span>{store.language === 'en' ? 'EN' : 'বাংলা'}</span>
          </button>

          {/* Firestore Cloud Sync Button */}
          {canAccessTab(activeUser, 'backup') && (
            <button
              type="button"
              onClick={() => setShowFirestoreModal(true)}
              className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              title={
                store.last_firestore_sync_at
                  ? `Firestore Cloud Sync (Last synced: ${new Date(
                      store.last_firestore_sync_at
                    ).toLocaleString()})`
                  : 'Sync with Firebase Firestore'
              }
            >
              <Database className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="hidden lg:inline">{isBn ? 'ক্লাউড সিঙ্ক' : 'Firestore'}</span>
            </button>
          )}

          {/* Google Drive Update Button */}
          {canAccessTab(activeUser, 'drive') && (
            <button
              type="button"
              onClick={() => setShowDriveUpdateModal(true)}
              className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              title={
                store.last_drive_sync_at
                  ? `Update Google Drive (Last synced: ${new Date(
                      store.last_drive_sync_at
                    ).toLocaleString()})`
                  : 'Click to Update Google Drive'
              }
            >
              <CloudUpload className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <span className="hidden lg:inline">{isBn ? 'ড্রাইভ আপডেট' : 'Drive'}</span>
            </button>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotificationModal(!showNotificationModal)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer relative"
              title="Alerts & Stock Warnings"
            >
              <Bell className="w-4 h-4" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {totalAlerts}
                </span>
              )}
            </button>

            {showNotificationModal && (
              <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-lg border border-slate-200 p-4 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-rose-600" />
                    <span>{isBn ? 'স্টোর ও বাকি অ্যালার্ট' : 'Store & Due Alerts'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNotificationModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
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
                      className="w-full text-left p-3 bg-rose-50 hover:bg-rose-100/70 rounded-xl border border-rose-200 flex items-start gap-2.5 transition-colors cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-rose-900 block">
                          {isBn ? 'স্টক সতর্কতা' : 'Low Stock Warning'}
                        </span>
                        <span className="text-rose-700 text-[11px]">
                          {lowStockItems.length} product variants need restock.
                        </span>
                      </div>
                    </button>
                  )}

                  {dueCustomers.length > 0 && (
                    <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-bold text-amber-950">
                            {isBn ? `বাকি কাস্টমার (${dueCustomers.length})` : `Due Customers (${dueCustomers.length})`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotificationModal(false);
                            setActiveTab('customer_due');
                          }}
                          className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer shrink-0"
                        >
                          {isBn ? 'সব দেখুন →' : 'View All →'}
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
                                className="p-2 bg-white rounded-lg border border-amber-200/80 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-slate-900 truncate flex items-center gap-1">
                                    <span>{dc.name}</span>
                                    {overdue && (
                                      <span className="px-1 py-0.5 rounded bg-rose-100 text-rose-700 text-[8px] uppercase font-bold">
                                        OVERDUE
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-rose-700 font-semibold">
                                    {store.currency_symbol}
                                    {dc.total_due_amount.toLocaleString()} · {dc.mobile}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <a
                                    href={buildWhatsAppUrl(dc.mobile, msg)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => logDueAlert(dc.id, 'whatsapp', 'Header quick WhatsApp')}
                                    className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={buildSmsUrl(dc.mobile, msg)}
                                    onClick={() => logDueAlert(dc.id, 'sms', 'Header quick SMS')}
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
                                    className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer"
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
                      {isBn ? 'কোনো নতুন অ্যালার্ট নেই।' : 'All stock and dues are balanced.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Switcher */}
          <button
            type="button"
            onClick={() => {
              setShowUserModal(true);
              setSelectedUser(activeUser);
            }}
            className="h-8 sm:h-9 px-1.5 sm:px-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title={`Active: ${activeUser.name} (@${activeUser.username})`}
          >
            <div className="w-6 h-6 rounded-lg bg-[#16a34a] text-white flex items-center justify-center text-xs font-bold shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden xl:inline text-xs font-semibold text-white max-w-[90px] truncate">
              {activeUser.name.split(' ')[0]}
            </span>
          </button>

          {/* Primary POS Quick CTA */}
          {activeTab !== 'pos' && (
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold hidden sm:inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs relative"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{isBn ? 'POS বিলিং' : 'POS'}</span>
              {heldCarts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-[10px] font-bold">
                  {heldCarts.length}
                </span>
              )}
            </button>
          )}
          </div>

          {/* Mobile & Tablet Full-Width Shop Logo + Name Row */}
          <div className="w-full lg:hidden flex items-center gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowLogoModal(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500 text-white border border-white/25 hover:border-white/50 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-xs transition-colors"
              title={isBn ? 'দোকানের লোগো পরিবর্তন করুন' : 'Customize Shop Logo'}
            >
              {store.store_logo ? (
                <img
                  src={store.store_logo}
                  alt={store.store_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </button>

            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="font-extrabold text-sm sm:text-base text-white leading-snug break-words">
                {store.store_name}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-300/35 text-emerald-100 text-[10px] font-bold shrink-0">
                {store.business_mode === 'pharmacy'
                  ? isBn
                    ? 'ফার্মেসি'
                    : 'Pharmacy'
                  : store.business_mode === 'general_shop'
                  ? isBn
                    ? 'জেনারেল শপ'
                    : 'General Shop'
                  : isBn
                  ? 'ফার্মেসি ও সুপার শপ'
                  : 'Pharmacy & Super Shop'}
              </span>
              {store.receipt_header && (
                <span className="text-[11px] text-sky-200 leading-snug">
                  · {store.receipt_header}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* LINE 2: Full Shop Contact, Address, Email, VAT/BIN & Proprietor */}
        <div className="py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-blue-100/95">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
            {store.store_address && (
              <span className="inline-flex items-start sm:items-center gap-1 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5 sm:mt-0" />
                <span className="break-words">{store.store_address}</span>
              </span>
            )}
            {(store.store_phone || store.store_mobile) && (
              <span className="inline-flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>
                  {store.store_phone}
                  {store.store_mobile && store.store_mobile !== store.store_phone
                    ? ` / ${store.store_mobile}`
                    : ''}
                </span>
              </span>
            )}
            {store.store_email && (
              <span className="inline-flex items-center gap-1 break-all">
                <Mail className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>{store.store_email}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            {store.vat_bin_number && (
              <span className="inline-flex items-center gap-1 font-mono text-amber-200">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>BIN/VAT: {store.vat_bin_number}</span>
              </span>
            )}
            {store.seller_name && (
              <span className="hidden md:inline-flex items-center gap-1 text-blue-100">
                <Store className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>
                  {isBn ? 'প্রোপ্রাইটর:' : 'Owner:'} <strong className="text-white">{store.seller_name}</strong>
                </span>
              </span>
            )}
          </div>
        </div>

        {/* LINE 3: Active Module/Page + Date & Time + Cash Shift + Active Staff */}
        <div className="py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white/15 border border-white/20 font-bold text-white">
              {isBn ? currentTabInfo.bn : currentTabInfo.en}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-emerald-200">
              <Clock className="w-3 h-3 text-emerald-300 shrink-0" />
              {openCashSession
                ? `${isBn ? 'শিফট চালু' : 'Shift Open'}: ${store.currency_symbol}${openCashSession.opening_cash.toLocaleString()}`
                : isBn
                ? 'শিফট বন্ধ'
                : 'Shift Closed'}
            </span>
            <span className="hidden sm:inline text-blue-200/80 font-mono">
              · {isBn ? 'ব্রাঞ্চ' : 'Branch'}: {store.branch_id || 'MAIN'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-blue-100 font-mono">
            {dateStr && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>{dateStr}</span>
              </span>
            )}
            {timeStr && (
              <span className="inline-flex items-center gap-1 text-white font-semibold">
                <Clock className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>{timeStr}</span>
              </span>
            )}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-200 capitalize font-sans">
              <UserCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>
                {activeUser.name} ({activeUser.role})
              </span>
              {activeEmployee && (
                <span className="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px] font-mono text-white normal-case">
                  {activeEmployee.employee_code}
                  {activeEmployee.shift_label ? ` · ${activeEmployee.shift_label}` : ''}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* User Switch Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[92vh] overflow-y-auto text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isBn ? 'ইউজার পরিবর্তন করুন' : 'Switch Active Staff'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users
                .filter((u) => demoEnabled || u.role !== 'visitor')
                .map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const isActiveNow = activeUser.id === u.id;
                  const linkedEmp =
                    employees.find((e) => e.linked_user_id === u.id && e.active) ||
                    employees.find((e) => e.linked_user_id === u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSwitchUserClick(u)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{u.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-semibold capitalize shrink-0">
                              {u.role}
                            </span>
                            {isActiveNow && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                                CURRENT
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-mono font-semibold">
                              Emp ID: {linkedEmp ? linkedEmp.employee_code : 'N/A'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono font-medium">
                              App ID: @{u.username}
                            </span>
                            {linkedEmp?.shift_label && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/80 text-amber-800 font-medium">
                                {linkedEmp.shift_label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSelected && <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
            </div>

            {selectedUser && (() => {
              const selectedEmp =
                employees.find((e) => e.linked_user_id === selectedUser.id && e.active) ||
                employees.find((e) => e.linked_user_id === selectedUser.id);
              return (
                <form onSubmit={handlePinSubmit} className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="font-semibold text-slate-700 truncate">{selectedUser.name}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selectedEmp && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-semibold">
                          Emp ID: {selectedEmp.employee_code}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono font-semibold">
                        App ID: @{selectedUser.username}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      Password / PIN for {selectedUser.name}:
                    </label>
                    <input
                      type="password"
                      maxLength={24}
                      autoFocus
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value)}
                      placeholder="Enter Password or PIN"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-center text-base tracking-widest font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    {pinError && <p className="text-xs text-rose-600 mt-1 font-medium">{pinError}</p>}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSwitchingUser}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>{isSwitchingUser ? 'Switching...' : 'Confirm Switch'}</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Shop Logo Upload Modal */}
      {showLogoModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[92vh] overflow-y-auto text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Shop Logo</h3>
                  <p className="text-xs text-slate-500">দোকানের লোগো আপলোড বা পরিবর্তন করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                {store.store_logo ? (
                  <img
                    src={store.store_logo}
                    alt={store.store_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl">
                    {store.store_name.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-slate-800">{store.store_name}</span>
            </div>

            <div className="space-y-2">
              <label className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload Shop Logo</span>
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
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mandatory/Quick Change Default Admin PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[92vh] overflow-y-auto text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Change Owner Admin PIN</h3>
                  <p className="text-[11px] text-slate-500">ডিফল্ট পিন (1234) পরিবর্তন করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePinModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
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
                  New Password / PIN (min 4 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={24}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Enter strong new PIN"
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
                  placeholder="Re-enter new PIN"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {isChangingPin ? 'Saving...' : 'Update PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {headerAlertCustomer && (
        <DueAlertModal
          customer={headerAlertCustomer}
          onClose={() => setHeaderAlertCustomer(null)}
        />
      )}

      {showDriveUpdateModal && (
        <QuickDriveUpdateModal onClose={() => setShowDriveUpdateModal(false)} />
      )}

      {showFirestoreModal && (
        <QuickCloudSyncModal onClose={() => setShowFirestoreModal(false)} />
      )}
    </header>
  );
};
