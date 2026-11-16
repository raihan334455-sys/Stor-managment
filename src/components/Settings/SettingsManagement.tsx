import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BackupManagement } from '../Backup/BackupManagement';
import { AuditLogsManagement } from '../Audit/AuditLogsManagement';
import { ALL_PERMISSIONS } from '../../utils/security';
import {
  Settings,
  Store,
  ToggleRight,
  FileText,
  Barcode,
  Printer,
  Percent,
  CreditCard,
  ShieldCheck,
  DatabaseBackup,
  History,
  Save,
  Upload,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  ShoppingCart,
  ShoppingBag,
  Pill,
  Layers,
} from 'lucide-react';
import { BusinessMode, PermissionKey, StoreSettings, User } from '../../types';
import { getBusinessMode, withBusinessMode } from '../../utils/modules';

type SettingsTab =
  | 'shop'
  | 'modules'
  | 'invoice'
  | 'barcode'
  | 'printer'
  | 'tax'
  | 'payments'
  | 'permissions'
  | 'database'
  | 'security';

export const SettingsManagement: React.FC = () => {
  const {
    store,
    updateStore,
    users,
    saveUser,
    clearTransactionHistory,
    wipeAllData,
    resetToDemoData,
    activeUser,
    checkPermission,
    setActiveTab,
  } = useApp();

  const [tab, setTab] = useState<SettingsTab>('shop');
  const [form, setForm] = useState<StoreSettings>(store);
  const [savedMsg, setSavedMsg] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectedPermUserId, setSelectedPermUserId] = useState<string>(users[0]?.id || '');
  const [permDraft, setPermDraft] = useState<PermissionKey[]>(users[0]?.permissions || []);
  const [permSaved, setPermSaved] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    type: 'clear_history' | 'wipe_all' | 'reset_demo';
    title: string;
    description: string;
    keyword: string;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    setForm(store);
  }, [store]);

  useEffect(() => {
    const visiblePermUsers = users.filter(
      (u) => store.demo_mode_enabled !== false || u.role !== 'visitor'
    );
    const target =
      visiblePermUsers.find((u) => u.id === selectedPermUserId) || visiblePermUsers[0];
    if (target) {
      setSelectedPermUserId(target.id);
      setPermDraft(target.permissions || []);
    }
  }, [selectedPermUserId, users, store.demo_mode_enabled]);

  if (!checkPermission('settings_manage')) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="p-8 max-w-lg w-full text-center bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">অ্যাক্সেস সংরক্ষিত (Access Restricted)</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              আপনার অ্যাকাউন্টে স্টোর সেটিংস দেখার বা পরিবর্তন করার অনুমতি নেই। কেবল অ্যাডমিন এই ডেটা দেখতে পারবেন।
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('pos')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>পিওএস টার্মিনালে ফিরে যান (Return to POS)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeBusinessMode: BusinessMode = getBusinessMode(form);

  const handleSwitchBusinessMode = (mode: BusinessMode) => {
    const nextStore = withBusinessMode(store, mode);
    setForm(nextStore);
    updateStore(nextStore);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleToggleModuleImmediate = (
    key: 'module_medicine_enabled' | 'module_general_product_enabled' | 'demo_mode_enabled',
    checked: boolean
  ) => {
    let nextStore: StoreSettings = {
      ...store,
      [key]: checked,
      updated_at: new Date().toISOString(),
    };
    if (key === 'module_medicine_enabled' || key === 'module_general_product_enabled') {
      const medOn =
        key === 'module_medicine_enabled'
          ? checked
          : nextStore.module_medicine_enabled !== false;
      const genOn =
        key === 'module_general_product_enabled'
          ? checked
          : nextStore.module_general_product_enabled !== false;
      const derivedMode: BusinessMode =
        medOn && genOn ? 'super_shop' : medOn ? 'pharmacy' : 'general_shop';
      nextStore = {
        ...nextStore,
        business_mode: derivedMode,
      };
    }
    setForm(nextStore);
    updateStore(nextStore);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const synced: StoreSettings = {
      ...form,
      store_phone: form.store_mobile || form.store_phone,
      store_mobile: form.store_mobile || form.store_phone,
      receipt_footer: form.receipt_footer_note || form.receipt_footer,
      receipt_footer_note: form.receipt_footer_note || form.receipt_footer,
      updated_at: new Date().toISOString(),
    };
    updateStore(synced);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleSavePermissions = async () => {
    const target: User | undefined = users.find((u) => u.id === selectedPermUserId);
    if (!target) return;
    await saveUser({ ...target, permissions: permDraft, updated_at: new Date().toISOString() });
    setPermSaved(true);
    setTimeout(() => setPermSaved(false), 2500);
  };

  const handleExecuteDataAction = async () => {
    if (!confirmModal) return;
    if (confirmInput.trim().toUpperCase() !== confirmModal.keyword) {
      setConfirmError(`অনুগ্রহ করে নিশ্চিত করতে '${confirmModal.keyword}' লিখুন`);
      return;
    }

    if (confirmModal.type === 'clear_history') {
      clearTransactionHistory();
      setActionSuccess('সকল বিক্রয়, দেনা-পাওনা ও লেনদেন হিস্ট্রি মুছে ফেলা হয়েছে (পণ্য ক্যাটালগ সংরক্ষিত আছে)। All transaction history cleared.');
    } else if (confirmModal.type === 'wipe_all') {
      wipeAllData();
      setActionSuccess('সম্পূর্ণ ডেটা মুছে স্টোর একদম নতুন অবস্থায় সেট করা হয়েছে। All store data wiped clean for fresh start.');
    } else if (confirmModal.type === 'reset_demo') {
      await resetToDemoData();
      setActionSuccess('স্টোর সফলভাবে ডেমো ডেটায় রিসেট হয়েছে। Database reset to default demo seeds.');
    }

    setConfirmModal(null);
    setConfirmInput('');
    setConfirmError('');
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const enabledPayments = form.enabled_payment_methods || {
    cash: true,
    bkash: true,
    nagad: true,
    rocket: true,
    card: true,
    bank: true,
  };

  const selectedPermUser = users.find((u) => u.id === selectedPermUserId);

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 text-slate-800 space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">Store & System Settings</h1>
            <p className="text-xs text-slate-500">
              Shop Business Mode, Logo, Invoice, Barcode, Printer, Tax/VAT, Payments, Permissions & Backup
            </p>
          </div>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configuration saved successfully!</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 no-print">
        {[
          { id: 'shop', label: 'Shop Info & Mode', icon: Store },
          { id: 'modules', label: 'Business Mode & ON/OFF', icon: ToggleRight },
          { id: 'invoice', label: 'Invoice Settings', icon: FileText },
          { id: 'barcode', label: 'Barcode Settings', icon: Barcode },
          { id: 'printer', label: 'Printer Settings', icon: Printer },
          { id: 'tax', label: 'Tax & VAT', icon: Percent },
          { id: 'payments', label: 'Payment Methods', icon: CreditCard },
          { id: 'permissions', label: 'User Permissions', icon: ShieldCheck },
          { id: 'database', label: 'Database & Backup', icon: DatabaseBackup },
          { id: 'security', label: 'Security & Activity Log', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as SettingsTab)}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 leading-tight cursor-pointer transition-colors ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* FORM-DRIVEN SETTINGS TABS */}
      {['shop', 'modules', 'invoice', 'barcode', 'printer', 'tax', 'payments'].includes(tab) && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5">
          {tab === 'shop' && (
            <>
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Shop Configuration & Business Type
              </h2>

              {/* Business Type 3-Mode Selector */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      ব্যবসার ধরন (Shop Business Type)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      মেনু ও ফিচার ব্যবসার ধরন অনুযায়ী সাজানো হবে। মোড পরিবর্তন করলে পুরনো কোনো ডেটা মুছবে না।
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                    Active:{' '}
                    {activeBusinessMode === 'general_shop'
                      ? 'General Product Shop'
                      : activeBusinessMode === 'pharmacy'
                      ? 'Pharmacy Shop'
                      : 'Super Shop (Both)'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {[
                    {
                      mode: 'general_shop' as BusinessMode,
                      title: 'General Product Shop',
                      subtitle: 'মুদি / জেনারেল স্টোর — শুধু সাধারণ পণ্য ও স্টক (ওষুধ ফিচার লুকানো)',
                      icon: ShoppingBag,
                    },
                    {
                      mode: 'pharmacy' as BusinessMode,
                      title: 'Pharmacy Shop',
                      subtitle: 'ফার্মেসি — ওষুধ, ব্যাচ, এক্সপায়ারি ও জেনেরিক (সাধারণ পণ্য লুকানো)',
                      icon: Pill,
                    },
                    {
                      mode: 'super_shop' as BusinessMode,
                      title: 'Super Shop (Product + Medicine)',
                      subtitle: 'সুপার শপ — সাধারণ পণ্য ও ওষুধ দুই মডিউল একসাথে ও আলাদা রিপোর্ট',
                      icon: Layers,
                    },
                  ].map((opt) => {
                    const ModeIcon = opt.icon;
                    const selected = activeBusinessMode === opt.mode;
                    return (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => handleSwitchBusinessMode(opt.mode)}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                          selected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <ModeIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 leading-tight">{opt.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                  {form.store_logo ? (
                    <img src={form.store_logo} alt="Store Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-700 text-white flex items-center justify-center font-bold text-2xl">
                      {form.store_name?.charAt(0) || 'S'}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-800 block">Shop Logo Upload</span>
                  <p className="text-[11px] text-slate-500">Printed on header, sidebar, and thermal/PDF receipts.</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                    <label className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () =>
                            setForm({ ...form, store_logo: reader.result as string, receipt_show_logo: true });
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {form.store_logo && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, store_logo: undefined })}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-rose-600 rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store Name *</label>
                  <input
                    type="text"
                    required
                    value={form.store_name}
                    onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store Mobile / Phone *</label>
                  <input
                    type="text"
                    required
                    value={form.store_mobile || form.store_phone}
                    onChange={(e) => setForm({ ...form, store_mobile: e.target.value, store_phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store Email</label>
                  <input
                    type="email"
                    value={form.store_email || ''}
                    onChange={(e) => setForm({ ...form, store_email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Seller Name</label>
                  <input
                    type="text"
                    value={form.seller_name}
                    onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Store Address</label>
                  <input
                    type="text"
                    value={form.store_address}
                    onChange={(e) => setForm({ ...form, store_address: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={form.currency_symbol}
                    onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Overdue Alert Days</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.due_alert_days ?? 7}
                    onChange={(e) => setForm({ ...form, due_alert_days: parseInt(e.target.value, 10) || 7 })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Due Alert Amount</label>
                  <input
                    type="number"
                    min={0}
                    value={form.due_alert_threshold ?? 500}
                    onChange={(e) => setForm({ ...form, due_alert_threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Alert Payment Info</label>
                  <input
                    type="text"
                    value={form.due_payment_info || ''}
                    onChange={(e) => setForm({ ...form, due_payment_info: e.target.value })}
                    placeholder="bKash/Nagad: 017..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'modules' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Shop Business Mode & Module ON / OFF Switches
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  কোনো মডিউল বন্ধ (OFF) করলে বা ব্যবসার ধরন পরিবর্তন করলে সম্পর্কিত মেনু ও ফিল্ড স্বয়ংক্রিয়ভাবে লুকানো হবে — কোনো পূর্বের ডেটা ডিলিট হবে না।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {[
                  {
                    mode: 'general_shop' as BusinessMode,
                    title: 'General Product Shop',
                    desc: 'Hides Medicine menu, Batch, Expiry, Generic & Company fields.',
                    icon: ShoppingBag,
                  },
                  {
                    mode: 'pharmacy' as BusinessMode,
                    title: 'Pharmacy Shop',
                    desc: 'Hides General Product catalog & keeps Pharmacy workflows.',
                    icon: Pill,
                  },
                  {
                    mode: 'super_shop' as BusinessMode,
                    title: 'Super Shop (Both)',
                    desc: 'Shows both General Products and Pharmacy Medicines cleanly.',
                    icon: Layers,
                  },
                ].map((opt) => {
                  const ModeIcon = opt.icon;
                  const selected = activeBusinessMode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => handleSwitchBusinessMode(opt.mode)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors flex items-start gap-2.5 ${
                        selected
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          selected ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
                        }`}
                      >
                        <ModeIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{opt.title}</span>
                        <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3 text-xs pt-1">
                <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block">Medicine Management Module (Pharmacy)</span>
                    <span className="text-slate-500">Show/Hide Medicine List, Generics, Companies, Batch, Expiry & Medicine Barcodes.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.module_medicine_enabled !== false}
                    onChange={(e) => handleToggleModuleImmediate('module_medicine_enabled', e.target.checked)}
                    className="w-5 h-5 accent-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block">General Product Management Module</span>
                    <span className="text-slate-500">Show/Hide General Products, Brands, Units, Product Stock & Product Barcodes.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.module_general_product_enabled !== false}
                    onChange={(e) => handleToggleModuleImmediate('module_general_product_enabled', e.target.checked)}
                    className="w-5 h-5 accent-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block">Public Demo Visitor Account (demo / 1234)</span>
                    <span className="text-slate-500">Disable Demo Login for production security on live shop terminals.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.demo_mode_enabled !== false}
                    onChange={(e) => handleToggleModuleImmediate('demo_mode_enabled', e.target.checked)}
                    className="w-5 h-5 accent-emerald-600"
                  />
                </label>
              </div>
            </div>
          )}

          {tab === 'invoice' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Invoice & Receipt Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Number Prefix</label>
                  <input
                    type="text"
                    value={form.invoice_prefix || 'INV'}
                    onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase() })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receipt Header Text</label>
                  <input
                    type="text"
                    value={form.receipt_header || ''}
                    onChange={(e) => setForm({ ...form, receipt_header: e.target.value })}
                    placeholder="Bismillahir Rahmanir Rahim / Quality Products"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Receipt Footer Note</label>
                  <input
                    type="text"
                    value={form.receipt_footer_note || form.receipt_footer || ''}
                    onChange={(e) =>
                      setForm({ ...form, receipt_footer_note: e.target.value, receipt_footer: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Return & Exchange Policy</label>
                  <input
                    type="text"
                    value={form.return_policy || ''}
                    onChange={(e) => setForm({ ...form, return_policy: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {[
                  { key: 'receipt_show_logo', label: 'Show Shop Logo' },
                  { key: 'receipt_show_customer', label: 'Show Customer Info' },
                  { key: 'receipt_show_seller', label: 'Show Cashier / Seller' },
                  { key: 'receipt_show_discount', label: 'Show Discount Row' },
                  { key: 'receipt_show_signature', label: 'Show Signature Line' },
                  { key: 'receipt_show_return_policy', label: 'Show Return Policy' },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <span className="font-semibold text-slate-700">{opt.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean((form as unknown as Record<string, unknown>)[opt.key])}
                      onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === 'barcode' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Barcode Label Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Auto-Generated Barcode Prefix</label>
                  <input
                    type="text"
                    value={form.barcode_prefix || '894'}
                    onChange={(e) => setForm({ ...form, barcode_prefix: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'barcode_show_store_name', label: 'Show Store Name on Label' },
                  { key: 'barcode_show_price', label: 'Show Sale Price on Label' },
                  { key: 'barcode_show_mrp', label: 'Show MRP on Label' },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <span className="font-semibold text-slate-700">{opt.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean((form as unknown as Record<string, unknown>)[opt.key])}
                      onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === 'printer' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Thermal & Invoice Printer Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receipt Paper Width</label>
                  <select
                    value={form.receipt_size}
                    onChange={(e) => setForm({ ...form, receipt_size: e.target.value as '58mm' | '80mm' })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="80mm">80mm Standard Thermal POS Printer</option>
                    <option value="58mm">58mm Compact Bluetooth Thermal Printer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Print Copies</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={form.printer_copies ?? 1}
                    onChange={(e) => setForm({ ...form, printer_copies: parseInt(e.target.value, 10) || 1 })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Auto-Open Print Receipt on Checkout</span>
                  <span className="text-slate-500">Automatically display printable receipt after sale completion.</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(form.printer_auto_print)}
                  onChange={(e) => setForm({ ...form, printer_auto_print: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600"
                />
              </label>
            </div>
          )}

          {tab === 'tax' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Tax & VAT Settings
              </h2>
              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Enable VAT / Tax Calculation</span>
                  <span className="text-slate-500">Apply configured percentage to taxable sales & show on invoices.</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(form.tax_enabled)}
                  onChange={(e) => setForm({ ...form, tax_enabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600"
                />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax / VAT Percentage (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={form.tax_percentage ?? 0}
                    onChange={(e) => setForm({ ...form, tax_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">VAT BIN / Tax Registration Number</label>
                  <input
                    type="text"
                    value={form.vat_bin_number || ''}
                    onChange={(e) => setForm({ ...form, vat_bin_number: e.target.value })}
                    placeholder="e.g. BIN-001234567-0101"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'payments' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Accepted Payment Methods
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'cash', label: 'Cash Payment' },
                  { key: 'bkash', label: 'bKash Mobile Banking' },
                  { key: 'nagad', label: 'Nagad Mobile Banking' },
                  { key: 'rocket', label: 'Rocket Mobile Banking' },
                  { key: 'card', label: 'Debit / Credit Card' },
                  { key: 'bank', label: 'Bank Transfer / Cheque' },
                ].map((m) => (
                  <label key={m.key} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <span className="font-bold text-slate-800">{m.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean((enabledPayments as unknown as Record<string, boolean>)[m.key])}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          enabled_payment_methods: {
                            ...enabledPayments,
                            [m.key]: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: USER PERMISSIONS */}
      {tab === 'permissions' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Granular User Permissions</h2>
              <p className="text-slate-500">Assign or revoke module permissions per staff account.</p>
            </div>
            <select
              value={selectedPermUserId}
              onChange={(e) => setSelectedPermUserId(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
            >
              {users
                .filter((u) => store.demo_mode_enabled !== false || u.role !== 'visitor')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username} · {u.role})
                  </option>
                ))}
            </select>
          </div>

          {permSaved && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold">
              User permissions updated successfully.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {ALL_PERMISSIONS.map((perm) => {
              const checked = selectedPermUser?.role === 'admin' || permDraft.includes(perm);
              return (
                <label
                  key={perm}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
                >
                  <span className="font-mono font-semibold text-slate-800">{perm}</span>
                  <input
                    type="checkbox"
                    disabled={selectedPermUser?.role === 'admin'}
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPermDraft([...new Set([...permDraft, perm])]);
                      } else {
                        setPermDraft(permDraft.filter((p) => p !== perm));
                      }
                    }}
                    className="w-4 h-4 accent-emerald-600"
                  />
                </label>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={selectedPermUser?.role === 'admin'}
              onClick={() => void handleSavePermissions()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold cursor-pointer transition-colors"
            >
              {selectedPermUser?.role === 'admin' ? 'Admin Has Full Access' : 'Save User Permissions'}
            </button>
          </div>
        </div>
      )}

      {/* TAB: DATABASE SETTINGS + BACKUP & RESTORE */}
      {tab === 'database' && (
        <div className="space-y-6">
          {activeUser.role === 'admin' && (
            <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Database Settings & Data Reset Zone</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <RotateCcw className="w-4 h-4 text-amber-600" />
                      <span>Clear Transaction History</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Keeps product & medicine catalog intact; clears sales, dues, expenses, and shift history.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        type: 'clear_history',
                        title: 'Clear Transaction History',
                        description: 'Clears sales, customer/supplier ledgers, expenses, and cash sessions while keeping products.',
                        keyword: 'CLEAR',
                      });
                      setConfirmInput('');
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>

                <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Wipe All Data (Fresh Start)</span>
                    </div>
                    <p className="text-[11px] text-rose-800">
                      Erases all products, stock, customers, suppliers, and transactions for a clean launch.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        type: 'wipe_all',
                        title: 'Wipe All Store Data',
                        description: 'Permanently erases all products, stock, customers, suppliers, and transactions.',
                        keyword: 'WIPE',
                      });
                      setConfirmInput('');
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Wipe All Data
                  </button>
                </div>

                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                      <RotateCcw className="w-4 h-4 text-blue-600" />
                      <span>Reset to Demo Seed Data</span>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      Restores factory sample products, categories, suppliers, and demo records.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        type: 'reset_demo',
                        title: 'Reset to Demo Seed Data',
                        description: 'Replaces current database with default demo dataset.',
                        keyword: 'DEMO',
                      });
                      setConfirmInput('');
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Reset Demo Data
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <BackupManagement embedded />
          </div>
        </div>
      )}

      {/* TAB: SECURITY & ACTIVITY LOG */}
      {tab === 'security' && (
        <div className="-m-4 sm:-m-6">
          <AuditLogsManagement />
        </div>
      )}

      {/* CONFIRMATION MODAL FOR ADMIN DATABASE ACTIONS */}
      {activeUser.role === 'admin' && confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{confirmModal.title}</span>
            </div>
            <p className="text-xs text-slate-600">{confirmModal.description}</p>
            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-700">
                Type <strong className="text-rose-600 font-mono">{confirmModal.keyword}</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder={`Type ${confirmModal.keyword}`}
                value={confirmInput}
                onChange={(e) => {
                  setConfirmInput(e.target.value);
                  setConfirmError('');
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-center tracking-widest text-rose-600 uppercase"
                autoFocus
              />
              {confirmError && <p className="text-[11px] text-rose-600 font-semibold pt-1">{confirmError}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null);
                  setConfirmInput('');
                  setConfirmError('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput.trim().toUpperCase() !== confirmModal.keyword}
                onClick={() => void handleExecuteDataAction()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
