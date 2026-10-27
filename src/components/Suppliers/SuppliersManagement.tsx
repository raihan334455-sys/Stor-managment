import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Plus,
  Search,
  Phone,
  Building2,
  DollarSign,
  CreditCard,
  History,
  CheckCircle,
  AlertCircle,
  X,
  MapPin,
  Mail,
  Edit,
} from 'lucide-react';
import { Supplier, PaymentMethodType } from '../../types';

export const SuppliersManagement: React.FC = () => {
  const { suppliers, purchases, supplierDues, store, paySupplierDue, saveSupplier } = useApp();

  const [search, setSearch] = useState('');
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<Supplier | null>(null);

  // Add/Edit Supplier Modal
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [supMobile, setSupMobile] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Pay Due Modal
  const [showPayDueModal, setShowPayDueModal] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethodType>('cash');
  const [payNotes, setPayNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setSupName('');
    setCompanyName('');
    setSupMobile('');
    setSupEmail('');
    setSupAddress('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupName(sup.name);
    setCompanyName(sup.company_name);
    setSupMobile(sup.mobile);
    setSupEmail(sup.email || '');
    setSupAddress(sup.address || '');
    setShowAddEditModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supMobile.trim()) {
      alert('Supplier name and mobile are required.');
      return;
    }

    const supplierData: Supplier = {
      id: editingSupplier ? editingSupplier.id : `sup_${Date.now()}`,
      name: supName.trim(),
      company_name: companyName.trim() || supName.trim(),
      mobile: supMobile.trim(),
      email: supEmail.trim() || undefined,
      address: supAddress.trim() || undefined,
      total_purchases: editingSupplier ? editingSupplier.total_purchases : 0,
      total_paid: editingSupplier ? editingSupplier.total_paid : 0,
      total_due: editingSupplier ? editingSupplier.total_due : 0,
      active: true,
      created_at: editingSupplier ? editingSupplier.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
      branch_id: store.branch_id,
    };

    saveSupplier(supplierData);
    setShowAddEditModal(false);
  };

  const handleOpenPayDue = (sup: Supplier) => {
    setPayingSupplier(sup);
    setPayAmount(sup.total_due > 0 ? sup.total_due.toString() : '');
    setPayMethod('cash');
    setPayNotes('');
    setShowPayDueModal(true);
  };

  const handleConfirmPayDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplier) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (amount > payingSupplier.total_due) {
      if (!confirm(`Amount ৳${amount} exceeds total due ৳${payingSupplier.total_due}. Continue?`)) {
        return;
      }
    }

    paySupplierDue(payingSupplier.id, amount, payMethod, payNotes);
    setShowPayDueModal(false);
    setPayingSupplier(null);
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(q) ||
      s.company_name.toLowerCase().includes(q) ||
      s.mobile.includes(q);
    const matchDue = filterDueOnly ? s.total_due > 0 : true;
    return matchSearch && matchDue;
  });

  const totalPayable = suppliers.reduce((sum, s) => sum + s.total_due, 0);
  const totalPurchased = suppliers.reduce((sum, s) => sum + s.total_purchases, 0);

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Suppliers & Vendor Accounts</span>
          </h1>
          <p className="text-xs text-slate-500">
            Manage vendor profiles, purchase history, and supplier accounts payable (Dues).
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Suppliers</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{suppliers.length}</div>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">
              {suppliers.filter((s) => s.total_due > 0).length} with outstanding balance
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Cumulative Purchases</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {store.currency_symbol}
              {totalPurchased.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">Total Sourced Value</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Outstanding Due</span>
            <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
              {store.currency_symbol}
              {totalPayable.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-600 font-semibold mt-1 inline-block">Accounts Payable</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by supplier name, company, or mobile..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={filterDueOnly}
                onChange={(e) => setFilterDueOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-0"
              />
              <span className="font-semibold text-amber-700">Due Only</span>
            </label>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredSuppliers.length} of {suppliers.length} vendors
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                <th className="p-3">SUPPLIER & COMPANY</th>
                <th className="p-3">CONTACT</th>
                <th className="p-3">ADDRESS</th>
                <th className="p-3 text-right">TOTAL PURCHASES</th>
                <th className="p-3 text-right">PAID</th>
                <th className="p-3 text-right">CURRENT DUE</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {sup.name.charAt(0)}
                      </div>
                      <div>
                        <div>{sup.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-normal">
                          <Building2 className="w-3 h-3" />
                          <span>{sup.company_name}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-slate-600">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{sup.mobile}</span>
                    </div>
                    {sup.email && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{sup.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">
                    {sup.address ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{sup.address}</span>
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {store.currency_symbol}
                    {sup.total_purchases.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                    {store.currency_symbol}
                    {sup.total_paid.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {sup.total_due > 0 ? (
                      <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {store.currency_symbol}
                        {sup.total_due.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Cleared</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {sup.total_due > 0 && (
                      <button
                        onClick={() => handleOpenPayDue(sup)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <CreditCard className="w-3 h-3 text-amber-600" />
                        <span>Pay Due</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedSupplierForLedger(sup)}
                      className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <History className="w-3 h-3 text-blue-600" />
                      <span>Ledger</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(sup)}
                      className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                    >
                      <Edit className="w-3 h-3 text-slate-600" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No suppliers match the current search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahim Miah"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Enterprise Name</label>
                <input
                  type="text"
                  placeholder="e.g. City Oil Mills Ltd."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="017XXXXXXXX"
                    value={supMobile}
                    onChange={(e) => setSupMobile(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office / Warehouse Address</label>
                <input
                  type="text"
                  placeholder="e.g. 12 Khatunganj, Chattogram"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Due Modal */}
      {showPayDueModal && payingSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Pay Supplier Due</h3>
                <p className="text-xs text-slate-500">
                  {payingSupplier.name} ({payingSupplier.company_name})
                </p>
              </div>
              <button
                onClick={() => setShowPayDueModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayDue} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Total Outstanding Payable:</span>
                <span className="font-mono font-bold text-base text-amber-700">
                  {store.currency_symbol}
                  {payingSupplier.total_due.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount ({store.currency_symbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  max={payingSupplier.total_due}
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-bold font-mono text-emerald-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethodType)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  <option value="cash">Cash In Hand</option>
                  <option value="bank">Bank Wire / Cheque</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Voucher Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via IBBL Cheque #4928"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayDueModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Ledger Modal */}
      {selectedSupplierForLedger && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl p-6 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Supplier Ledger Statement</h3>
                <p className="text-xs text-slate-500">
                  {selectedSupplierForLedger.name} - {selectedSupplierForLedger.company_name} ({selectedSupplierForLedger.mobile})
                </p>
              </div>
              <button
                onClick={() => setSelectedSupplierForLedger(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block">Total Purchases</span>
                <span className="font-bold font-mono text-slate-800">
                  {store.currency_symbol}
                  {selectedSupplierForLedger.total_purchases.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Paid</span>
                <span className="font-bold font-mono text-emerald-600">
                  {store.currency_symbol}
                  {selectedSupplierForLedger.total_paid.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Outstanding Due</span>
                <span className="font-bold font-mono text-amber-600">
                  {store.currency_symbol}
                  {selectedSupplierForLedger.total_due.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <th className="p-2.5">DATE</th>
                    <th className="p-2.5">TRANSACTION / TYPE</th>
                    <th className="p-2.5 text-right">TOTAL</th>
                    <th className="p-2.5 text-right">PAID</th>
                    <th className="p-2.5 text-right">DUE BALANCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierDues
                    .filter((d) => d.supplier_id === selectedSupplierForLedger.id)
                    .map((tx) => (
                      <tr key={tx.id}>
                        <td className="p-2.5 font-mono text-slate-500">
                          {tx.date} {tx.time}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mr-1.5 ${
                              tx.type === 'due_added'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tx.type === 'due_added' ? 'Purchase Credit' : 'Payment'}
                          </span>
                          <span className="text-slate-700">{tx.description}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          {store.currency_symbol}
                          {tx.total_amount.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-600 font-semibold">
                          {store.currency_symbol}
                          {tx.paid_amount.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-amber-700">
                          {store.currency_symbol}
                          {tx.balance_after.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  {supplierDues.filter((d) => d.supplier_id === selectedSupplierForLedger.id).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No transactions recorded in ledger for this supplier.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedSupplierForLedger(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
