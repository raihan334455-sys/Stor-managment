import React, { useEffect, useRef, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { SidebarNav, MobileBottomNav } from './components/SidebarNav';
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
import { GoogleDriveManagement } from './components/GoogleDrive/GoogleDriveManagement';
import { LoginScreen } from './components/Auth/LoginScreen';
import { ModernDashboard } from './components/Dashboard/ModernDashboard';
import { PaymentReceiptsCenter } from './components/Receipts/PaymentReceiptsCenter';
import { ReceiptShareModal } from './components/Receipts/ReceiptShareModal';
import { MedicineManagement } from './components/Products/MedicineManagement';
import { GeneralProductManagement } from './components/Products/GeneralProductManagement';
import { AccountsManagement } from './components/Accounts/AccountsManagement';
import { EmployeeManagement } from './components/Employees/EmployeeManagement';
import { SettingsManagement } from './components/Settings/SettingsManagement';
import { canAccessTab } from './utils/security';
import {
  isGeneralProductModuleEnabled,
  isMedicineModuleEnabled,
} from './utils/modules';
import {
  downloadReceiptAsPng,
  resolveCustomerForSale,
  UnifiedReceiptPayload,
} from './utils/receiptDownload';
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
  Camera,
  Share2,
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
    <div className="p-4 sm:p-6 bg-slate-50 min-h-full w-full text-slate-800 space-y-6">
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
  const {
    sales,
    customers,
    customerDues,
    suppliers,
    supplierDues,
    store,
    setPrintableReceipt,
    setActiveTab,
    voidSale,
    checkPermission,
  } = useApp();
  const [search, setSearch] = useState('');
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const [shareReceipt, setShareReceipt] = useState<UnifiedReceiptPayload | null>(null);
  const canVoidSale = checkPermission('invoice_cancel');

  const filteredSales = sales.filter(
    (s) =>
      s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_mobile.includes(search)
  );

  return (
    <div className="p-3 sm:p-5 lg:p-6 bg-slate-50 min-h-full text-slate-800 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-slate-900">
            <ReceiptText className="w-5 h-5 text-emerald-600" />
            <span>{store.language === 'bn' ? 'বিক্রয় ও ইনভয়েস ইতিহাস' : 'Sales & Invoice History'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            {store.language === 'bn'
              ? 'ইনভয়েস খুঁজুন, থার্মাল রশিদ প্রিন্ট বা শেয়ার করুন'
              : 'Search past invoices, reprint receipts, and inspect sale breakdown.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, name or mobile..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 min-h-[40px]"
            />
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>All Receipts</span>
          </button>
        </div>
      </div>

      {/* MOBILE COMPACT CARD LAYOUT */}
      <div className="md:hidden space-y-2.5">
        {filteredSales.map((s) => {
          const cust = resolveCustomerForSale(s, customers);
          const isCleared = cust !== undefined && (cust.total_due_amount || 0) <= 0.01;
          return (
            <div
              key={s.id}
              className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-xs text-emerald-600">
                    {s.invoice_number}
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {s.customer_name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {s.date} · {s.time}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sm text-slate-900">
                    {store.currency_symbol}
                    {s.grand_total.toLocaleString()}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1 mt-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {s.status}
                    </span>
                    {s.status === 'completed' && s.due_amount > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isCleared
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isCleared ? 'Cleared' : `Due ${store.currency_symbol}${s.due_amount}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPrintableReceipt({ type: 'sale', data: s })}
                  className="py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadReceiptAsPng(
                      { type: 'sale', data: s },
                      { store, customers, customerDues, suppliers, supplierDues, sales }
                    )
                  }
                  className="py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareReceipt({ type: 'sale', data: s })}
                  className="py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
              {canVoidSale && s.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => setVoidTarget(s)}
                  className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-semibold cursor-pointer"
                >
                  Void Invoice
                </button>
              )}
            </div>
          );
        })}
        {filteredSales.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
            No sales invoices match your search.
          </div>
        )}
      </div>

      {/* DESKTOP & TABLET TABLE */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
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
                  <td className="p-3.5 font-mono font-bold text-emerald-600">{s.invoice_number}</td>
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
                    <div className="inline-flex flex-wrap items-center justify-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {s.status}
                      </span>
                      {s.status === 'completed' && s.due_amount > 0 && (() => {
                        const cust = resolveCustomerForSale(s, customers);
                        const isCleared = cust !== undefined && (cust.total_due_amount || 0) <= 0.01;
                        return (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isCleared
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isCleared ? 'Due Cleared' : `Due ${store.currency_symbol}${s.due_amount}`}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="p-3.5 text-right flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShareReceipt({ type: 'sale', data: s })}
                      title="Share Receipt"
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadReceiptAsPng(
                          { type: 'sale', data: s },
                          { store, customers, customerDues, suppliers, supplierDues, sales }
                        )
                      }
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => setPrintableReceipt({ type: 'sale', data: s })}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3 text-emerald-600" />
                      <span>Receipt</span>
                    </button>
                    {canVoidSale && s.status === 'completed' && (
                      <button
                        onClick={() => setVoidTarget(s)}
                        className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[11px] font-semibold cursor-pointer"
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

      {voidTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="pos-modal-enter bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Void Invoice #{voidTarget.invoice_number}?</span>
            </h3>
            <p className="text-xs text-slate-600">
              এই ইনভয়েস বাতিল করলে পণ্যের স্টক অটোমেটিক্যালি ফিরে আসবে এবং কাস্টমার বাকি (যদি থাকে) সমন্বয় করা হবে।
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  voidSale(voidTarget.id, 'Cancelled by authorized user');
                  setVoidTarget(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
      {shareReceipt && (
        <ReceiptShareModal
          receipt={shareReceipt}
          onClose={() => setShareReceipt(null)}
        />
      )}
    </div>
  );
};



const BarcodeCenterRouter: React.FC<{ medEnabled: boolean; genEnabled: boolean }> = ({
  medEnabled,
  genEnabled,
}) => {
  const [section, setSection] = useState<'general' | 'medicine'>(
    genEnabled ? 'general' : 'medicine'
  );

  if (medEnabled && !genEnabled) {
    return <MedicineManagement initialTab="barcode" />;
  }
  if (genEnabled && !medEnabled) {
    return <GeneralProductManagement initialTab="barcode" />;
  }
  return (
    <div className="space-y-0">
      <div className="px-4 sm:px-6 pt-4 pb-1 bg-slate-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSection('general')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            section === 'general'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          General Product Barcodes
        </button>
        <button
          type="button"
          onClick={() => setSection('medicine')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            section === 'medicine'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Medicine Barcodes
        </button>
      </div>
      {section === 'general' ? (
        <GeneralProductManagement initialTab="barcode" />
      ) : (
        <MedicineManagement initialTab="barcode" />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                MAIN APPLICATION                           */
/* -------------------------------------------------------------------------- */
const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, printableReceipt, setPrintableReceipt, isAuthenticated, activeUser, store } = useApp();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isTabletExpanded, setIsTabletExpanded] = useState(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const medEnabled = isMedicineModuleEnabled(store);
  const genEnabled = isGeneralProductModuleEnabled(store);

  const renderTabContent = () => {
    if (!canAccessTab(activeUser, activeTab)) {
      return (
        <div className="min-h-full w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6">
          <div className="p-6 sm:p-8 max-w-lg w-full text-center bg-white border border-slate-200 rounded-2xl space-y-4">
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">অ্যাক্সেস সংরক্ষিত (Access Restricted)</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                আপনার বর্তমান রোলে ({activeUser.role}) এই মডিউলটি দেখার অনুমতি নেই। কেবল অনুমোদিত ইউজার এই ডেটা পরিচালনা করতে পারবেন।
              </p>
            </div>
            <div className="pt-1">
              <button
                onClick={() => setActiveTab('pos')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>পিওএস টার্মিনালে ফিরে যান (Return to POS)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <ModernDashboard />;
      case 'pos':
        return <POSView />;
      case 'products':
        if (!medEnabled && !genEnabled) {
          return (
            <div className="min-h-full w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6">
              <div className="p-6 sm:p-8 max-w-lg w-full text-center bg-white border border-slate-200 rounded-2xl space-y-4">
                <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Product & Medicine Modules Closed</h2>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Medicine Management এবং General Product Management উভয় মডিউল বর্তমানে বন্ধ (OFF) আছে। চালু করতে Store Settings &gt; Module ON/OFF ব্যবহার করুন।
                  </p>
                </div>
                {canAccessTab(activeUser, 'settings') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Open Module ON/OFF Settings</span>
                  </button>
                )}
              </div>
            </div>
          );
        }
        return <ProductManagement />;
      case 'medicine':
        return <MedicineManagement />;
      case 'general_products':
        return <GeneralProductManagement />;
      case 'inventory':
        return <StockManagement initialTab="overview" />;
      case 'personal_use':
        return <StockManagement initialTab="personal_use" />;
      case 'stock_adjustment':
        return <StockManagement initialTab="adjustments" initialAdjType="stock_correction" />;
      case 'damaged_stock':
        return <StockManagement initialTab="adjustments" initialAdjType="damaged_stock" />;
      case 'barcode':
        return <BarcodeCenterRouter medEnabled={medEnabled} genEnabled={genEnabled} />;
      case 'customers':
      case 'customer_due':
        return <CustomerManagement />;
      case 'receipts':
        return <PaymentReceiptsCenter />;
      case 'sales':
        return <SalesHistoryView />;
      case 'settings':
        return <SettingsManagement />;
      case 'purchases':
        return <PurchasesManagement />;
      case 'suppliers':
        return <SuppliersManagement initialFilterDueOnly={false} />;
      case 'supplier_due':
        return <SuppliersManagement initialFilterDueOnly={true} />;
      case 'returns':
        return <ReturnsManagement />;
      case 'accounts':
        return <AccountsManagement />;
      case 'expenses':
        return <ExpensesManagement />;
      case 'cash':
        return <CashDrawerManagement />;
      case 'employees':
        return <EmployeeManagement />;
      case 'quotations':
        return <QuotationsManagement />;
      case 'reports':
        return <ReportsManagement />;
      case 'users':
        return <UsersManagement />;
      case 'backup':
        return <BackupManagement />;
      case 'drive':
        return <GoogleDriveManagement />;
      case 'audit':
        return <AuditLogsManagement />;
      default:
        return <ModernDashboard />;
    }
  };

  return (
    <div className="h-dvh w-full bg-slate-50 flex font-sans text-slate-800 overflow-hidden print:h-auto print:overflow-visible">
      <SidebarNav
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        setIsDesktopCollapsed={setIsDesktopCollapsed}
        isTabletExpanded={isTabletExpanded}
        setIsTabletExpanded={setIsTabletExpanded}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:h-auto print:overflow-visible">
        <Header
          onToggleMobileMenu={() => setIsMobileOpen(true)}
          onToggleTabletSidebar={() => setIsTabletExpanded(true)}
        />
        <main
          ref={mainScrollRef}
          className={`flex-1 min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden bg-slate-50 print:overflow-visible print:pb-0 ${
            activeTab === 'pos' ? 'pb-20 xl:pb-0' : 'pb-20 md:pb-6'
          }`}
        >
          <div
            key={activeTab}
            className={`pos-page-enter w-full bg-slate-50 ${
              activeTab === 'pos' ? 'min-h-full xl:h-full' : 'min-h-full'
            }`}
          >
            {renderTabContent()}
          </div>
        </main>
      </div>

      <MobileBottomNav onOpenMenu={() => setIsMobileOpen(true)} />

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
