import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { POSView } from './components/POS/POSView';
import { ThermalReceipt } from './components/POS/ThermalReceipt';
import { ProductManagement } from './components/Products/ProductManagement';
import { StockManagement } from './components/Inventory/StockManagement';
import { CustomerManagement } from './components/Customers/CustomerManagement';
import { PurchasesManagement } from './components/Purchases/PurchasesManagement';
import { SuppliersManagement } from './components/Suppliers/SuppliersManagement';
import { ReturnsManagement } from './components/Returns/ReturnsManagement';
import { ExpensesManagement } from './components/Expenses/ExpensesManagement';
import { CashDrawerManagement } from './components/Cash/CashDrawerManagement';
import { QuotationsManagement } from './components/Quotations/QuotationsManagement';
import { ReportsManagement } from './components/Reports/ReportsManagement';
import { UsersManagement } from './components/Users/UsersManagement';
import { BackupManagement } from './components/Backup/BackupManagement';
import { AuditLogsManagement } from './components/Audit/AuditLogsManagement';
import { LoginScreen } from './components/Auth/LoginScreen';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  CreditCard,
  ReceiptText,
  RotateCcw,
  Banknote,
  Wallet,
  FileText,
  BarChart3,
  ShieldAlert,
  Settings,
  DatabaseBackup,
  History,
  Plus,
  Search,
  Printer,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Save,
  Download,
  Upload,
  RefreshCw,
  X,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                DASHBOARD VIEW                             */
/* -------------------------------------------------------------------------- */
const DashboardView: React.FC = () => {
  const { sales, products, customers, store, setActiveTab, setPrintableReceipt } = useApp();

  const today = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((s) => s.date === today && s.status === 'completed');
  const todayTotal = todaySales.reduce((sum, s) => sum + s.grand_total, 0);

  const lowStockProducts = products.flatMap((p) => p.variants).filter((v) => v.stock_quantity <= v.min_stock_level);
  const totalCustomerDue = customers.reduce((sum, c) => sum + (c.total_due_amount || 0), 0);

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            <span>Store Dashboard & Real-Time Overview</span>
          </h1>
          <p className="text-xs text-slate-500">
            Monitor daily revenue, inventory status, active customer dues, and recent sales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open POS Terminal</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Today's Total Sales</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {store.currency_symbol}
              {todayTotal.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">
              {todaySales.length} Transactions Completed
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Products</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{products.length}</div>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 inline-block">
              {products.reduce((acc, p) => acc + p.variants.length, 0)} Active Variants
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Low Stock Alerts</span>
            <div className="text-2xl font-bold font-mono text-rose-600 mt-1">{lowStockProducts.length}</div>
            <span className="text-[10px] text-rose-500 font-semibold mt-1 inline-block">
              {lowStockProducts.length > 0 ? 'Requires Stock Reorder' : 'All Items Sufficient'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Customer Dues</span>
            <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
              {store.currency_symbol}
              {totalCustomerDue.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-600 font-semibold mt-1 inline-block">
              {customers.filter((c) => c.total_due_amount > 0).length} Customers Pending
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-blue-600" />
            <span>Recent Sales Transactions</span>
          </h3>
          <button
            onClick={() => setActiveTab('sales')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            View All Sales →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                <th className="p-3">INVOICE NO</th>
                <th className="p-3">DATE & TIME</th>
                <th className="p-3">CUSTOMER</th>
                <th className="p-3 text-right">TOTAL</th>
                <th className="p-3 text-center">PAYMENT</th>
                <th className="p-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.slice(0, 6).map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-600">{sale.invoice_number}</td>
                  <td className="p-3 text-slate-500 font-mono">
                    {sale.date} {sale.time}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{sale.customer_name}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {store.currency_symbol}
                    {sale.grand_total}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setPrintableReceipt({ type: 'sale', data: sale })}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
                    >
                      <Printer className="w-3 h-3 text-blue-600" />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No sales transactions recorded yet. Click "Open POS Terminal" to make a sale.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                SALES HISTORY VIEW                         */
/* -------------------------------------------------------------------------- */
const SalesHistoryView: React.FC = () => {
  const { sales, store, setPrintableReceipt, voidSale } = useApp();
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const filteredSales = sales.filter(
    (s) =>
      s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_mobile.includes(search)
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <ReceiptText className="w-6 h-6 text-blue-600" />
            <span>Sales & Invoice History</span>
          </h1>
          <p className="text-xs text-slate-500">Search past invoices, reprint thermal receipts, and view sale breakdown.</p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, customer name or mobile..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
              <th className="p-3.5">INVOICE NO</th>
              <th className="p-3.5">DATE & TIME</th>
              <th className="p-3.5">CUSTOMER</th>
              <th className="p-3.5 text-right">SUBTOTAL</th>
              <th className="p-3.5 text-right">DISCOUNT</th>
              <th className="p-3.5 text-right">TOTAL</th>
              <th className="p-3.5 text-center">STATUS</th>
              <th className="p-3.5 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3.5 font-mono font-bold text-blue-600">{s.invoice_number}</td>
                <td className="p-3.5 text-slate-500 font-mono">
                  {s.date} {s.time}
                </td>
                <td className="p-3.5 font-semibold text-slate-800">{s.customer_name}</td>
                <td className="p-3.5 text-right font-mono text-slate-600">
                  {store.currency_symbol}
                  {s.subtotal}
                </td>
                <td className="p-3.5 text-right font-mono text-slate-500">
                  {store.currency_symbol}
                  {s.discount_amount}
                </td>
                <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                  {store.currency_symbol}
                  {s.grand_total}
                </td>
                <td className="p-3.5 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="p-3.5 text-right flex items-center justify-end gap-2">
                  <button
                    onClick={() => setPrintableReceipt({ type: 'sale', data: s })}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
                  >
                    <Printer className="w-3 h-3 text-blue-600" />
                    <span>Receipt</span>
                  </button>
                  {s.status === 'completed' && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to void invoice ${s.invoice_number}?`)) {
                          voidSale(s.id, 'Customer requested cancellation');
                        }
                      }}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded text-[11px] font-semibold"
                    >
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  No sales invoices match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                SETTINGS VIEW                              */
/* -------------------------------------------------------------------------- */
const SettingsView: React.FC = () => {
  const { store, updateStore, clearTransactionHistory, wipeAllData, resetToDemoData } = useApp();
  const [form, setForm] = useState(store);
  const [savedMsg, setSavedMsg] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    type: 'clear_history' | 'wipe_all' | 'reset_demo';
    title: string;
    description: string;
    keyword: string;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore(form);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleExecuteDataAction = () => {
    if (!confirmModal) return;
    if (confirmInput.trim().toUpperCase() !== confirmModal.keyword) {
      alert(`অনুগ্রহ করে নিশ্চিত করতে '${confirmModal.keyword}' টাইপ করুন (Please type ${confirmModal.keyword})`);
      return;
    }

    if (confirmModal.type === 'clear_history') {
      clearTransactionHistory();
      setActionSuccess('সকল বিক্রয়, দেনা-পাওনা ও লেনদেন হিস্ট্রি মুছে ফেলা হয়েছে (পণ্য ক্যাটালগ সংরক্ষিত আছে)। All transaction history cleared.');
    } else if (confirmModal.type === 'wipe_all') {
      wipeAllData();
      setActionSuccess('সম্পূর্ণ ডেটা মুছে স্টোর একদম নতুন অবস্থায় সেট করা হয়েছে। All store data wiped clean for fresh start.');
    } else if (confirmModal.type === 'reset_demo') {
      resetToDemoData();
      setActionSuccess('স্টোর সফলভাবে ডেমো ডেটায় রিসেট হয়েছে। Database reset to default demo seeds.');
    }

    setConfirmModal(null);
    setConfirmInput('');
    setTimeout(() => setActionSuccess(null), 5000);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
          <Settings className="w-6 h-6 text-blue-600" />
          <span>Store & Thermal Printer Settings</span>
        </h1>
        <p className="text-xs text-slate-500">Configure store branding, currency, receipt header/footer, and thermal printer sizing.</p>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Store configuration updated successfully!</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">দোকানের তথ্য ও রসিদ সেটিংস (Store Profile & Receipt)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name *</label>
            <input
              type="text"
              required
              value={form.store_name}
              onChange={(e) => setForm({ ...form, store_name: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Mobile / Phone *</label>
            <input
              type="text"
              required
              value={form.store_mobile}
              onChange={(e) => setForm({ ...form, store_mobile: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Address</label>
            <input
              type="text"
              value={form.store_address}
              onChange={(e) => setForm({ ...form, store_address: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol</label>
            <input
              type="text"
              value={form.currency_symbol}
              onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Paper Size</label>
            <select
              value={form.receipt_size}
              onChange={(e) => setForm({ ...form, receipt_size: e.target.value as '80mm' | '58mm' })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="80mm">80mm Standard POS Printer</option>
              <option value="58mm">58mm Compact Bluetooth Thermal Printer</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Footer Note</label>
            <input
              type="text"
              value={form.receipt_footer_note}
              onChange={(e) => setForm({ ...form, receipt_footer_note: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Data Remove & History Reset Operations */}
      <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <span>ডেটা মুছে ফেলা ও হিস্ট্রি রিসেট (Data Management & Reset Zone)</span>
        </div>
        <p className="text-xs text-slate-500">
          আপনার ব্যবসার সুবিধার্থে টেস্ট বিক্রয় হিস্ট্রি মুছে ফেলা অথবা নতুন লাইভ শপ শুরুর জন্য নিচের অপশনগুলো ব্যবহার করুন।
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Card 1: Clear Transaction History Only (Keep Products) */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>সমস্ত বিক্রয় ও লেনদেন হিস্ট্রি মুছুন</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                পণ্য ক্যাটালগ ও ক্যাটাগরি <strong>ঠিক থাকবে</strong>। শুধু সমস্ত টেস্ট বিক্রয়, দেনা-পাওনা ledger, খরচ, ও ক্যাশ ড্রয়ার হিস্ট্রি মুছে ০ করা হবে।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmModal({
                  type: 'clear_history',
                  title: 'বিক্রয় ও লেনদেন হিস্ট্রি মুছে ফেলা নিশ্চিত করুন',
                  description: 'এই অপশনে ক্লিক করলে আপনার সমস্ত বিক্রয় রেকর্ড, কাস্টমার বাকি লেজার, সাপ্লায়ার বাকি লেজার এবং খরচের হিস্ট্রি মুছে যাবে। তবে পণ্যের তালিকা (Products Catalog) অক্ষত থাকবে।',
                  keyword: 'CLEAR',
                });
                setConfirmInput('');
              }}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Transaction History</span>
            </button>
          </div>

          {/* Card 2: Wipe All Data Clean (Fresh Store Launch) */}
          <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>সব ডেটা মুছে একদম নতুন শুরু (Wipe All Data)</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                দোকানের পণ্য, ক্যাটাগরি, কাস্টমার, বিক্রয় সব কিছু মুছে সম্পূর্ণ খালি ডাটাবেস নিয়ে ফ্রেশ বিজনেস শুরু করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmModal({
                  type: 'wipe_all',
                  title: 'সম্পূর্ণ স্টোর ডেটা ওয়াইপ নিশ্চিত করুন',
                  description: 'এটি আপনার দোকানের পণ্য তালিকা, স্টক, কাস্টমার, বিক্রয় সহ সমস্ত ডেটা চিরতরে মুছে ফেলবে এবং একদম খালি স্টোর তৈরি করবে।',
                  keyword: 'WIPE',
                });
                setConfirmInput('');
              }}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe All Data (Fresh Start)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safety Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{confirmModal.title}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-700">
                নিশ্চিত করতে নিচে <strong className="text-rose-600 font-mono">{confirmModal.keyword}</strong> লিখুন:
              </label>
              <input
                type="text"
                placeholder={`Type ${confirmModal.keyword}`}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-center tracking-widest text-rose-600 focus:outline-none focus:border-rose-500 uppercase"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null);
                  setConfirmInput('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                disabled={confirmInput.trim().toUpperCase() !== confirmModal.keyword}
                onClick={handleExecuteDataAction}
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

/* -------------------------------------------------------------------------- */
/*                                GENERIC FALLBACK TAB                       */
/* -------------------------------------------------------------------------- */
const GenericTabPlaceholder: React.FC<{ title: string; description: string }> = ({ title, description }) => {
  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold shadow-sm">
        <Package className="w-8 h-8" />
      </div>
      <div className="max-w-md">
        <h2 className="text-lg font-bold text-slate-800">{title} Module Active</h2>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                MAIN APPLICATION                           */
/* -------------------------------------------------------------------------- */
const AppContent: React.FC = () => {
  const { activeTab, printableReceipt, setPrintableReceipt, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        return <POSView />;
      case 'products':
        return <ProductManagement />;
      case 'inventory':
        return <StockManagement />;
      case 'customers':
      case 'customer_due':
        return <CustomerManagement />;
      case 'sales':
        return <SalesHistoryView />;
      case 'settings':
        return <SettingsView />;
      case 'purchases':
        return <PurchasesManagement />;
      case 'suppliers':
        return <SuppliersManagement />;
      case 'returns':
        return <ReturnsManagement />;
      case 'expenses':
        return <ExpensesManagement />;
      case 'cash':
        return <CashDrawerManagement />;
      case 'quotations':
        return <QuotationsManagement />;
      case 'reports':
        return <ReportsManagement />;
      case 'users':
        return <UsersManagement />;
      case 'backup':
        return <BackupManagement />;
      case 'audit':
        return <AuditLogsManagement />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <SidebarNav />
        <main className="flex-1 overflow-y-auto bg-slate-50">{renderTabContent()}</main>
      </div>

      {/* Thermal Receipt Print Popup Modal */}
      {printableReceipt && (
        <ThermalReceipt receipt={printableReceipt} onClose={() => setPrintableReceipt(null)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
