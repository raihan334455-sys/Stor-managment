import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ReceiptText,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  CreditCard,
  Truck,
  ShoppingBag,
  Sparkles,
  Share2,
} from 'lucide-react';
import {
  downloadReceiptAsPng,
  isReceiptDueCleared,
  resolveCustomerForSale,
  UnifiedReceiptPayload,
} from '../../utils/receiptDownload';
import { getMobilePurchaseStats } from '../../utils/customerPurchaseStats';
import { canAccessTab } from '../../utils/security';
import { ReceiptShareModal } from './ReceiptShareModal';

type ReceiptFilterCategory =
  | 'all'
  | 'customer_due'
  | 'sale'
  | 'due_cleared'
  | 'due_pending'
  | 'supplier_due';

interface UnifiedReceiptRow {
  id: string;
  receiptNo: string;
  kind: 'sale' | 'due' | 'supplier_due';
  partyName: string;
  partyMobile: string;
  date: string;
  time: string;
  method: string;
  totalAmount: number;
  paidAmount: number;
  currentDue: number;
  status: 'cleared' | 'paid' | 'pending';
  payload: UnifiedReceiptPayload;
}

export const PaymentReceiptsCenter: React.FC = () => {
  const {
    sales,
    customers,
    customerDues,
    suppliers,
    supplierDues,
    store,
    activeUser,
    setPrintableReceipt,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<ReceiptFilterCategory>('all');
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<UnifiedReceiptPayload | null>(null);

  const canViewSuppliers = canAccessTab(activeUser, 'suppliers');

  const allReceipts = useMemo<UnifiedReceiptRow[]>(() => {
    const rows: UnifiedReceiptRow[] = [];

    // 1. All POS Sales Receipts (active/completed)
    for (const s of sales) {
      if (s.status === 'voided') continue;
      const liveCust = resolveCustomerForSale(s, customers);
      const liveDue =
        s.due_amount <= 0
          ? 0
          : liveCust !== undefined
          ? Math.max(0, liveCust.total_due_amount || 0)
          : s.due_amount;
      const cleared = isReceiptDueCleared({ type: 'sale', data: s }, { customers, suppliers });

      rows.push({
        id: `sale_${s.id}`,
        receiptNo: s.invoice_number,
        kind: 'sale',
        partyName: s.customer_name || 'Walk-in Customer',
        partyMobile: s.customer_mobile || '',
        date: s.date,
        time: s.time,
        method: s.payment_method,
        totalAmount: s.grand_total,
        paidAmount: s.paid_amount,
        currentDue: liveDue,
        status: s.due_amount <= 0 ? 'paid' : cleared ? 'cleared' : 'pending',
        payload: { type: 'sale', data: s },
      });
    }

    // 2. All Customer Due Payment Receipts
    for (const dt of customerDues) {
      if (dt.type !== 'due_payment') continue;
      const liveCust =
        customers.find((c) => c.id === dt.customer_id) ||
        customers.find((c) => (c.mobile || '').trim() === (dt.mobile || '').trim());
      const liveDue =
        liveCust !== undefined ? Math.max(0, liveCust.total_due_amount || 0) : dt.balance_after;
      const cleared = isReceiptDueCleared({ type: 'due', data: dt }, { customers, suppliers });

      rows.push({
        id: `cdue_${dt.id}`,
        receiptNo: `DUE-${dt.id.slice(-8).toUpperCase()}`,
        kind: 'due',
        partyName: dt.customer_name,
        partyMobile: dt.mobile || '',
        date: dt.date,
        time: dt.time,
        method: dt.payment_method || 'cash',
        totalAmount: dt.total_amount,
        paidAmount: dt.paid_amount,
        currentDue: cleared ? 0 : liveDue,
        status: cleared ? 'cleared' : 'pending',
        payload: { type: 'due', data: dt },
      });
    }

    // 3. All Supplier Due Payment Receipts
    if (canViewSuppliers) {
      for (const st of supplierDues) {
        if (st.type !== 'due_payment') continue;
        const liveSup = suppliers.find((s) => s.id === st.supplier_id);
        const liveDue =
          liveSup !== undefined ? Math.max(0, liveSup.total_due || 0) : st.balance_after;
        const cleared = isReceiptDueCleared(
          { type: 'supplier_due', data: st },
          { customers, suppliers }
        );

        rows.push({
          id: `sdue_${st.id}`,
          receiptNo: `SUP-${st.id.slice(-8).toUpperCase()}`,
          kind: 'supplier_due',
          partyName: st.supplier_name,
          partyMobile: liveSup?.mobile || '',
          date: st.date,
          time: st.time,
          method: st.payment_method || 'cash',
          totalAmount: st.total_amount,
          paidAmount: st.paid_amount,
          currentDue: cleared ? 0 : liveDue,
          status: cleared ? 'cleared' : 'pending',
          payload: { type: 'supplier_due', data: st },
        });
      }
    }

    // Sort newest first
    rows.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    return rows;
  }, [sales, customers, customerDues, suppliers, supplierDues, canViewSuppliers]);

  const filteredReceipts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allReceipts.filter((r) => {
      const matchesFilter =
        filterMode === 'all' ||
        (filterMode === 'sale' && r.kind === 'sale') ||
        (filterMode === 'customer_due' && r.kind === 'due') ||
        (filterMode === 'supplier_due' && r.kind === 'supplier_due') ||
        (filterMode === 'due_cleared' && r.status === 'cleared') ||
        (filterMode === 'due_pending' && r.status === 'pending');

      const matchesSearch =
        !q ||
        r.receiptNo.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q) ||
        r.partyMobile.toLowerCase().includes(q) ||
        r.date.includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [allReceipts, filterMode, search]);

  const totalClearedCount = allReceipts.filter((r) => r.status === 'cleared').length;
  const totalPendingCount = allReceipts.filter((r) => r.status === 'pending').length;

  const handleDownloadRow = (row: UnifiedReceiptRow) => {
    downloadReceiptAsPng(row.payload, {
      store,
      customers,
      customerDues,
      suppliers,
      supplierDues,
      sales,
    });
    setDownloadedId(row.id);
    setTimeout(() => setDownloadedId((prev) => (prev === row.id ? null : prev)), 2500);
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-5 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <ReceiptText className="w-6 h-6 text-[#5b46b5]" />
            <span>All Payment Receipts (এক জায়গায় সব রিসিপ্ট)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            সব POS সেলস রিসিপ্ট, কাস্টমার বকেয়া পরিশোধ (Due Cleared) ও সাপ্লায়ার পেমেন্ট রিসিপ্ট এখান থেকেই দেখুন, প্রিন্ট করুন ও ডাউনলোড করুন।
          </p>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Total Receipts</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
              {allReceipts.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 text-[#5b46b5] flex items-center justify-center">
            <ReceiptText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-emerald-700 font-bold uppercase">
              Due Cleared Receipts
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-0.5">
              {totalClearedCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-rose-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-rose-700 font-bold uppercase">Pending Due Invoices</div>
            <div className="text-2xl font-bold font-mono text-rose-700 mt-0.5">
              {totalPendingCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Category Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Invoice #, Receipt ID, Customer / Supplier Name or Mobile..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5b46b5]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All (${allReceipts.length})` },
              { id: 'due_cleared', label: `Due Cleared (${totalClearedCount})` },
              { id: 'customer_due', label: 'Customer Due Payments' },
              { id: 'sale', label: 'POS Sales' },
              { id: 'due_pending', label: `Due Pending (${totalPendingCount})` },
              ...(canViewSuppliers
                ? [{ id: 'supplier_due', label: 'Supplier Payments' }]
                : []),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as ReceiptFilterCategory)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-[#5b46b5] border-[#5b46b5] text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Compact Cards */}
        <div className="md:hidden space-y-2.5">
          {filteredReceipts.map((row) => (
            <div
              key={row.id}
              className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#5b46b5]">
                      {row.receiptNo}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-700">
                      {row.kind === 'sale'
                        ? 'POS Sale'
                        : row.kind === 'due'
                        ? 'Customer Due'
                        : 'Supplier Due'}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5 truncate">
                    {row.partyName}
                  </div>
                  {row.partyMobile && (
                    <div className="text-[11px] font-mono text-slate-500">{row.partyMobile}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sm text-emerald-700 tabular-nums">
                    {store.currency_symbol}
                    {row.paidAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">{row.method}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-mono text-slate-500">
                  {row.date} {row.time}
                </span>
                {row.status === 'cleared' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase">
                    <Sparkles className="w-3 h-3" />
                    Due Cleared
                  </span>
                ) : row.status === 'paid' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
                    Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">
                    Due {store.currency_symbol}
                    {row.currentDue.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setShareTarget(row.payload)}
                  className="py-2 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadRow(row)}
                  className="py-2 rounded-lg bg-[#5b46b5] hover:bg-[#4a379c] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadedId === row.id ? 'Saved!' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintableReceipt(row.payload)}
                  className="py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>View</span>
                </button>
              </div>
            </div>
          ))}
          {filteredReceipts.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              কোনো Payment Receipt পাওয়া যায়নি।
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase">
                <th className="p-3">RECEIPT / INV #</th>
                <th className="p-3">TYPE</th>
                <th className="p-3">CUSTOMER / PARTY</th>
                <th className="p-3">DATE & TIME</th>
                <th className="p-3 text-right">PAID</th>
                <th className="p-3 text-center">DUE STATUS</th>
                <th className="p-3 text-right">DOWNLOAD / PRINT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-[#5b46b5] whitespace-nowrap">
                    {row.receiptNo}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {row.kind === 'sale' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase">
                        <ShoppingBag className="w-3 h-3" />
                        POS Sale
                      </span>
                    ) : row.kind === 'due' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50 text-[#5b46b5] border border-violet-200 text-[10px] font-bold uppercase">
                        <CreditCard className="w-3 h-3" />
                        Customer Due
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase">
                        <Truck className="w-3 h-3" />
                        Supplier Due
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{row.partyName}</div>
                    {row.partyMobile && (
                      <div className="text-[10px] font-mono text-slate-500">{row.partyMobile}</div>
                    )}
                    {row.kind !== 'supplier_due' && row.partyMobile && (() => {
                      const mStats = getMobilePurchaseStats(row.partyMobile, sales);
                      if (mStats.totalOrders <= 0) return null;
                      return (
                        <div className="text-[10px] font-semibold text-[#5b46b5] mt-0.5">
                          এই নম্বরে মোট: {mStats.totalProductQuantity} টি পণ্য ({mStats.totalOrders} অর্ডার)
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {row.date} {row.time}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {store.currency_symbol}
                    {row.paidAmount.toLocaleString()}
                    <div className="text-[9px] text-slate-400 uppercase font-normal">
                      {row.method}
                    </div>
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    {row.status === 'cleared' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase">
                        <Sparkles className="w-3 h-3" />
                        Due Cleared ({store.currency_symbol}0)
                      </span>
                    ) : row.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
                        Paid / Clear
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">
                        Due {store.currency_symbol}
                        {row.currentDue.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShareTarget(row.payload)}
                        title="Share Receipt via SMS / WhatsApp / Email / Other Apps"
                        className="px-2.5 py-1.5 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadRow(row)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#5b46b5] hover:bg-[#4a379c] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>{downloadedId === row.id ? 'Saved!' : 'Download'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintableReceipt(row.payload)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-emerald-600" />
                        <span>View</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400 text-xs">
                    কোনো Payment Receipt পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {shareTarget && (
        <ReceiptShareModal
          receipt={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
};
