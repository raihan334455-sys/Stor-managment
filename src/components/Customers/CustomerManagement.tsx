import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Search,
  Plus,
  CreditCard,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Printer,
  X,
  History,
  DollarSign,
  BellRing,
  MessageCircle,
  MessageSquare,
  Calendar,
  Mail,
  Download,
  Package,
  Share2,
} from 'lucide-react';
import { Customer, PaymentMethodType } from '../../types';
import { DueAlertModal } from './DueAlertModal';
import { downloadReceiptAsPng, UnifiedReceiptPayload } from '../../utils/receiptDownload';
import { ReceiptShareModal } from '../Receipts/ReceiptShareModal';
import { getMobilePurchaseStats } from '../../utils/customerPurchaseStats';
import {
  buildDueReminderMessage,
  buildSmsUrl,
  buildTelUrl,
  buildWhatsAppUrl,
  isCustomerDueOverdue,
  wasAlertedToday,
} from '../../utils/dueAlerts';

export const CustomerManagement: React.FC = () => {
  const {
    activeTab,
    customers,
    customerDues,
    suppliers,
    supplierDues,
    sales,
    store,
    payCustomerDue,
    saveCustomer,
    logDueAlert,
    setPrintableReceipt,
  } = useApp();
  const [search, setSearch] = useState<string>('');
  const [dueFilterMode, setDueFilterMode] = useState<'all' | 'due' | 'overdue' | 'unalerted'>(
    activeTab === 'customer_due' ? 'due' : 'all'
  );
  const [alertCustomer, setAlertCustomer] = useState<Customer | null>(null);
  const [shareReceipt, setShareReceipt] = useState<UnifiedReceiptPayload | null>(null);

  React.useEffect(() => {
    if (activeTab === 'customer_due') {
      setDueFilterMode('due');
    }
  }, [activeTab]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Pay Due Modal State
  const [showPayDueModal, setShowPayDueModal] = useState<boolean>(false);
  const [payCustObj, setPayCustObj] = useState<Customer | null>(null);
  const [payAmountInput, setPayAmountInput] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethodType>('cash');
  const [payNote, setPayNote] = useState<string>('');

  // Add Customer Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [custName, setCustName] = useState<string>('');
  const [custMobile, setCustMobile] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');
  const [custPromiseDate, setCustPromiseDate] = useState<string>('');
  const [custType, setCustType] = useState<'regular' | 'vip' | 'wholesale'>('regular');

  const alertDaysThreshold = store.due_alert_days || 7;
  const dueCustomers = customers.filter((c) => (c.total_due_amount || 0) > 0);
  const overdueCustomers = dueCustomers.filter(
    (c) => isCustomerDueOverdue(c, alertDaysThreshold).overdue
  );
  const unalertedTodayCustomers = dueCustomers.filter((c) => !wasAlertedToday(c));

  const filteredCustomers = customers.filter((c) => {
    const hasDue = (c.total_due_amount || 0) > 0;
    const isOverdue = isCustomerDueOverdue(c, alertDaysThreshold).overdue;
    const notAlertedToday = hasDue && !wasAlertedToday(c);

    const matchesFilter =
      dueFilterMode === 'all' ||
      (dueFilterMode === 'due' && hasDue) ||
      (dueFilterMode === 'overdue' && isOverdue) ||
      (dueFilterMode === 'unalerted' && notAlertedToday);

    const q = search.toLowerCase();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      c.address?.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const totalAllCustomerDue = customers.reduce((acc, c) => acc + c.total_due_amount, 0);

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || filteredCustomers[0];
  const activeMobileStats = activeCustomer
    ? getMobilePurchaseStats(activeCustomer.mobile, sales, activeCustomer.id)
    : null;

  // Get customer specific due transactions & sales history
  const activeCustomerDues = activeCustomer
    ? customerDues.filter((d) => d.customer_id === activeCustomer.id)
    : [];
  const activeCustomerSales = activeCustomer
    ? sales.filter((s) => s.customer_id === activeCustomer.id || s.customer_mobile === activeCustomer.mobile)
    : [];

  const handleOpenPayDue = (c: Customer) => {
    setPayCustObj(c);
    setPayAmountInput(c.total_due_amount.toString());
    setPayNote('');
    setShowPayDueModal(true);
  };

  const handleConfirmPayDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustObj) return;
    const amount = parseFloat(payAmountInput) || 0;
    if (amount <= 0) return;

    payCustomerDue(payCustObj.id, amount, payMethod, payNote);
    setShowPayDueModal(false);
  };

  const handleSaveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custMobile.trim()) return;

    saveCustomer({
      id: `cust_${Date.now()}`,
      name: custName.trim(),
      mobile: custMobile.trim(),
      address: custAddress.trim(),
      email: custEmail.trim() || undefined,
      due_promise_date: custPromiseDate.trim() || undefined,
      customer_type: custType,
      total_orders: 0,
      total_purchase_amount: 0,
      total_paid_amount: 0,
      total_due_amount: 0,
      loyalty_points: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
      branch_id: store.branch_id,
    });

    setShowAddModal(false);
    setCustName('');
    setCustMobile('');
    setCustAddress('');
    setCustEmail('');
    setCustPromiseDate('');
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Total Registered Customers</div>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{customers.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-rose-200 rounded-2xl flex items-center justify-between bg-gradient-to-r from-rose-50/50 to-white shadow-sm">
          <div>
            <div className="text-xs text-rose-700 font-bold uppercase tracking-wider">
              Total Outstanding Customer Due
            </div>
            <div className="text-2xl font-bold text-rose-700 font-mono mt-1">
              {store.currency_symbol}
              {totalAllCustomerDue}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Customers with Outstanding Due</div>
            <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
              {customers.filter((c) => c.total_due_amount > 0).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Section split: Left customer list, Right customer ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Customer Directory List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Customer Directory</span>
            </h3>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Search & Due Filter Toggle */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Customer Name or Mobile..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick Due & Overdue Filter Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'all', label: `All (${customers.length})` },
                { id: 'due', label: `Due (${dueCustomers.length})` },
                { id: 'overdue', label: `Overdue (${overdueCustomers.length})` },
                { id: 'unalerted', label: `Alert Pending (${unalertedTodayCustomers.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDueFilterMode(tab.id as any)}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer truncate ${
                    dueFilterMode === tab.id
                      ? 'bg-[#ec1f73] border-[#ec1f73] text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Cards */}
          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
            {filteredCustomers.map((c) => {
              const isSelected = activeCustomer?.id === c.id;
              const overdueCheck = isCustomerDueOverdue(c, alertDaysThreshold);
              const alerted = wasAlertedToday(c);
              const cStats = getMobilePurchaseStats(c.mobile, sales, c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 text-slate-900 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-slate-800 truncate">{c.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      {c.mobile}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500">Orders: {cStats.totalOrders || c.total_orders}</span>
                      <span className="px-1.5 py-0.5 rounded bg-violet-50 text-[#5b46b5] border border-violet-200 text-[10px] font-bold">
                        কেনা পণ্য: {cStats.totalProductQuantity} টি
                      </span>
                      {overdueCheck.overdue && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                          OVERDUE
                        </span>
                      )}
                      {alerted && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                          Alerted
                        </span>
                      )}
                    </div>
                    {c.total_due_amount > 0 ? (
                      <span className="font-bold font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Due: {store.currency_symbol}
                        {c.total_due_amount}
                      </span>
                    ) : (
                      <span className="text-emerald-700 text-[10px] font-semibold">No Due</span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredCustomers.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-400">
                No customers match this filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Customer Due Ledger & History View */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-6 shadow-sm">
          {activeCustomer ? (
            <>
              {/* Customer Header Info */}
              <div className="flex flex-col gap-4 pb-4 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">{activeCustomer.name}</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {activeCustomer.customer_type}
                      </span>
                      {isCustomerDueOverdue(activeCustomer, alertDaysThreshold).overdue && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          {isCustomerDueOverdue(activeCustomer, alertDaysThreshold).reason}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {activeCustomer.mobile}
                      </span>
                      {activeCustomer.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {activeCustomer.address}
                        </span>
                      )}
                      {activeCustomer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {activeCustomer.email}
                        </span>
                      )}
                      {activeCustomer.due_promise_date && (
                        <span className="flex items-center gap-1 text-[#5b46b5] font-semibold">
                          <Calendar className="w-3.5 h-3.5" />
                          Due Date: {activeCustomer.due_promise_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Due Payment Button */}
                  {activeCustomer.total_due_amount > 0 ? (
                    <button
                      onClick={() => handleOpenPayDue(activeCustomer)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Pay Due ({store.currency_symbol}{activeCustomer.total_due_amount})</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
                      <CheckCircle className="w-4 h-4" />
                      <span>No Outstanding Due</span>
                    </div>
                  )}
                </div>

                {/* Multi-Channel Due Alert Quick Action Strip */}
                {activeCustomer.total_due_amount > 0 && (() => {
                  const quickMsg = buildDueReminderMessage({
                    customer: activeCustomer,
                    store,
                    lang: store.language === 'bn' ? 'bn' : 'both',
                  });
                  return (
                    <div className="p-3 rounded-2xl bg-[#f7f7fb] border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold text-[#1e1b3a] flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-[#ec1f73]" />
                        <span>Send Due Alert:</span>
                        {activeCustomer.last_alert_sent_at && (
                          <span className="text-[10px] font-normal text-slate-500">
                            Last: {activeCustomer.last_alert_channel?.toUpperCase()} ({new Date(activeCustomer.last_alert_sent_at).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={buildWhatsAppUrl(activeCustomer.mobile, quickMsg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => logDueAlert(activeCustomer.id, 'whatsapp', 'Quick ledger WhatsApp alert')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={buildSmsUrl(activeCustomer.mobile, quickMsg)}
                          onClick={() => logDueAlert(activeCustomer.id, 'sms', 'Quick ledger SMS alert')}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </a>
                        <a
                          href={buildTelUrl(activeCustomer.mobile)}
                          onClick={() => logDueAlert(activeCustomer.id, 'call', 'Quick ledger Call')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#5b46b5] hover:bg-[#4b389b] text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setAlertCustomer(activeCustomer)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span>Email / Other / Edit Msg</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Customer Stats Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Total Purchases</div>
                  <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                    {store.currency_symbol}
                    {activeCustomer.total_purchase_amount}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Total Paid</div>
                  <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                    {store.currency_symbol}
                    {activeCustomer.total_paid_amount}
                  </div>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-[10px] text-rose-700 uppercase font-bold">Current Due</div>
                  <div className="text-sm font-bold text-rose-700 font-mono mt-0.5">
                    {store.currency_symbol}
                    {activeCustomer.total_due_amount}
                  </div>
                </div>

                <div className="p-3 bg-violet-50 rounded-xl border border-violet-200">
                  <div className="text-[10px] text-[#5b46b5] uppercase font-bold">কেনা পণ্য (Products)</div>
                  <div className="text-sm font-bold text-[#5b46b5] font-mono mt-0.5">
                    {activeMobileStats?.totalProductQuantity || 0} টি
                  </div>
                  <div className="text-[10px] text-violet-700">
                    {activeMobileStats?.uniqueProductsCount || 0} রকমের • {activeMobileStats?.totalOrders || 0} অর্ডার
                  </div>
                </div>
              </div>

              {/* Due Ledger Transactions History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Customer Due Ledger Transactions</span>
                </h4>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] bg-slate-50 font-semibold">
                        <th className="p-2.5">DATE & TIME</th>
                        <th className="p-2.5">TYPE / REF</th>
                        <th className="p-2.5">DESCRIPTION</th>
                        <th className="p-2.5 text-right">PAID</th>
                        <th className="p-2.5 text-right">BALANCE</th>
                        <th className="p-2.5 text-right">RECEIPT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {activeCustomerDues.map((dt) => {
                        const isAccountCleared =
                          dt.type === 'due_payment' &&
                          (dt.balance_after <= 0.01 || (activeCustomer.total_due_amount || 0) <= 0.01);
                        const linkedSale =
                          dt.type === 'due_added' && dt.invoice_number
                            ? sales.find((s) => s.invoice_number === dt.invoice_number)
                            : undefined;
                        return (
                          <tr key={dt.id} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-500 text-[10px]">
                              {dt.date} {dt.time}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                  dt.type === 'due_added'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : isAccountCleared
                                    ? 'bg-emerald-600 text-white border border-emerald-600'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {dt.type === 'due_added'
                                  ? 'Credit Sale'
                                  : isAccountCleared
                                  ? 'Due Cleared'
                                  : 'Payment Received'}
                              </span>
                            </td>
                            <td className="p-2.5 font-sans text-slate-700 text-[11px]">
                              {dt.description}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">
                              {store.currency_symbol}
                              {dt.paid_amount}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-800">
                              {store.currency_symbol}
                              {dt.balance_after}
                            </td>
                            <td className="p-2.5 text-right">
                              {dt.type === 'due_payment' ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setShareReceipt({ type: 'due', data: dt })}
                                    title="Share Receipt via SMS / WhatsApp / Other Apps"
                                    className="p-1 rounded bg-[#ec1f73] hover:bg-[#d61665] text-white inline-flex items-center cursor-pointer"
                                  >
                                    <Share2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      downloadReceiptAsPng(
                                        { type: 'due', data: dt },
                                        { store, customers, customerDues, suppliers, supplierDues, sales }
                                      )
                                    }
                                    title="Download Receipt PNG"
                                    className="p-1 rounded bg-[#5b46b5] hover:bg-[#4a379c] text-white inline-flex items-center cursor-pointer"
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPrintableReceipt({ type: 'due', data: dt })}
                                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-sans font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Printer className="w-3 h-3 text-emerald-600" />
                                    <span>Receipt</span>
                                  </button>
                                </div>
                              ) : linkedSale ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setShareReceipt({ type: 'sale', data: linkedSale })}
                                    title="Share Receipt via SMS / WhatsApp / Other Apps"
                                    className="p-1 rounded bg-[#ec1f73] hover:bg-[#d61665] text-white inline-flex items-center cursor-pointer"
                                  >
                                    <Share2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      downloadReceiptAsPng(
                                        { type: 'sale', data: linkedSale },
                                        { store, customers, customerDues, suppliers, supplierDues, sales }
                                      )
                                    }
                                    title="Download Receipt PNG"
                                    className="p-1 rounded bg-[#5b46b5] hover:bg-[#4a379c] text-white inline-flex items-center cursor-pointer"
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPrintableReceipt({ type: 'sale', data: linkedSale })}
                                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-sans font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Printer className="w-3 h-3 text-blue-600" />
                                    <span>Receipt</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {activeCustomerDues.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 text-xs font-sans">
                            No due ledger records found for this customer
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>

              {/* Products Purchased By Same Phone/Mobile Number */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#5b46b5]" />
                    <span>এই নম্বরে কেনা সকল পণ্য ({activeCustomer.mobile})</span>
                  </h4>
                  <span className="text-[11px] font-bold text-[#5b46b5] bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full">
                    মোট: {activeMobileStats?.totalProductQuantity || 0} টি পণ্য ({activeMobileStats?.totalOrders || 0} অর্ডার)
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[10px] bg-slate-50 font-semibold">
                          <th className="p-2.5">PRODUCT & VARIANT</th>
                          <th className="p-2.5 text-center">ORDERS</th>
                          <th className="p-2.5 text-right">TOTAL QTY</th>
                          <th className="p-2.5 text-right">TOTAL SPENT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeMobileStats && activeMobileStats.breakdown.length > 0 ? (
                          activeMobileStats.breakdown.map((item) => (
                            <tr key={item.key} className="hover:bg-slate-50">
                              <td className="p-2.5">
                                <div className="font-semibold text-slate-800">{item.product_name}</div>
                                <div className="text-[10px] text-slate-500">{item.variant_name}</div>
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-600">
                                {item.order_count}x
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-[#5b46b5]">
                                {item.total_qty} {item.unit}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                                {store.currency_symbol}
                                {item.total_spent.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 text-xs">
                              এই মোবাইল নম্বরে এখনও কোনো পণ্য কেনার রেকর্ড নেই।
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-400">Select a customer to view ledger</div>
          )}
        </div>
      </div>

      {/* PAY DUE MODAL */}
      {showPayDueModal && payCustObj && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">Receive Customer Due Payment</h3>
              </div>
              <button
                onClick={() => setShowPayDueModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayDue} className="space-y-4 my-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-800">{payCustObj.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="font-mono text-slate-600">{payCustObj.mobile}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                  <span>Current Outstanding Due:</span>
                  <span className="font-mono">
                    {store.currency_symbol}
                    {payCustObj.total_due_amount}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Enter Payment Amount Received:</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-center text-2xl font-mono text-emerald-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method:</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethodType)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  <option value="cash">Cash</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPayDueModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-colors"
                >
                  Confirm Payment & Print Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Register Customer</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Rahim Ahmed"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={custMobile}
                  onChange={(e) => setCustMobile(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promised Pay Date</label>
                  <input
                    type="date"
                    value={custPromiseDate}
                    onChange={(e) => setCustPromiseDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="e.g. Mirpur, Dhaka"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-colors"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUE CUSTOMER ALERT MODAL */}
      {alertCustomer && (
        <DueAlertModal
          customer={alertCustomer}
          onClose={() => setAlertCustomer(null)}
        />
      )}

      {/* SHARE RECEIPT MODAL */}
      {shareReceipt && (
        <ReceiptShareModal
          receipt={shareReceipt}
          onClose={() => setShareReceipt(null)}
        />
      )}
    </div>
  );
};
