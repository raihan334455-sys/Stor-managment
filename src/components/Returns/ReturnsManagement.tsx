import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  RotateCcw,
  Search,
  Plus,
  Receipt,
  Printer,
  X,
  Package,
  Calendar,
  Clock,
  DollarSign,
} from 'lucide-react';
import { SaleReturn, PaymentMethodType, Sale } from '../../types';

export const ReturnsManagement: React.FC = () => {
  const { returns, sales, store, processReturn } = useApp();

  const [search, setSearch] = useState('');
  const [showNewReturnModal, setShowNewReturnModal] = useState(false);
  const [selectedReturnForView, setSelectedReturnForView] = useState<SaleReturn | null>(null);

  // New Return Modal State
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [matchedSale, setMatchedSale] = useState<Sale | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<{
    [variantId: string]: { selected: boolean; quantity: number; reason: string };
  }>({});
  const [refundMethod, setRefundMethod] = useState<PaymentMethodType>('cash');

  const handleSearchInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const query = invoiceQuery.trim().toLowerCase();
    const found = sales.find(
      (s) => s.invoice_number.toLowerCase() === query || s.id.toLowerCase() === query
    );
    if (!found) {
      alert('Invoice not found. Please verify the invoice number.');
      return;
    }
    if (found.status === 'voided') {
      alert('This invoice has already been voided.');
      return;
    }
    setMatchedSale(found);
    const initState: typeof returnItemsState = {};
    found.items.forEach((item) => {
      initState[item.variant_id] = {
        selected: false,
        quantity: 1,
        reason: 'Customer Request / Exchange',
      };
    });
    setReturnItemsState(initState);
  };

  const handleToggleItem = (variantId: string) => {
    setReturnItemsState((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        selected: !prev[variantId]?.selected,
      },
    }));
  };

  const handleQtyChange = (variantId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(qty, maxQty));
    setReturnItemsState((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        quantity: validQty,
      },
    }));
  };

  const handleReasonChange = (variantId: string, reason: string) => {
    setReturnItemsState((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        reason,
      },
    }));
  };

  // Calculate total refund
  const totalRefund = matchedSale
    ? matchedSale.items.reduce((sum, item) => {
        const state = returnItemsState[item.variant_id];
        if (state && state.selected) {
          return sum + item.unit_selling_price * state.quantity;
        }
        return sum;
      }, 0)
    : 0;

  const handleSubmitReturn = () => {
    if (!matchedSale) return;

    const itemsToReturn = matchedSale.items
      .filter((item) => returnItemsState[item.variant_id]?.selected)
      .map((item) => ({
        variant_id: item.variant_id,
        quantity: returnItemsState[item.variant_id].quantity,
        reason: returnItemsState[item.variant_id].reason,
      }));

    if (itemsToReturn.length === 0) {
      alert('Please select at least one item to return.');
      return;
    }

    const createdReturn = processReturn(
      matchedSale.invoice_number,
      itemsToReturn,
      refundMethod
    );

    if (createdReturn) {
      setShowNewReturnModal(false);
      setMatchedSale(null);
      setInvoiceQuery('');
      setSelectedReturnForView(createdReturn);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.return_number.toLowerCase().includes(q) ||
      r.invoice_number.toLowerCase().includes(q) ||
      r.customer_name.toLowerCase().includes(q)
    );
  });

  const totalRefundAmount = returns.reduce((sum, r) => sum + r.total_refund, 0);

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <RotateCcw className="w-6 h-6 text-blue-600" />
            <span>Sales Returns & Exchanges</span>
          </h1>
          <p className="text-xs text-slate-500">
            Process product returns, refund cash to customers, and automatically restock items into inventory.
          </p>
        </div>
        <button
          onClick={() => {
            setShowNewReturnModal(true);
            setMatchedSale(null);
            setInvoiceQuery('');
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Process Return / Exchange</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Returns Processed</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{returns.length}</div>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">Return Vouchers</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <RotateCcw className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Refund Payouts</span>
            <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
              {store.currency_symbol}
              {totalRefundAmount.toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-500 font-semibold mt-1 inline-block">Cash & Digital Refunds</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Restocked Inventory</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
              {returns.reduce((sum, r) => sum + r.items.reduce((acc, it) => acc + it.quantity, 0), 0)}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">Items Returned to Shelf</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search return #, original invoice, or customer..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredReturns.length} of {returns.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                <th className="p-3">RETURN #</th>
                <th className="p-3">ORIGINAL INVOICE</th>
                <th className="p-3">DATE & TIME</th>
                <th className="p-3">CUSTOMER</th>
                <th className="p-3">RETURNED ITEMS</th>
                <th className="p-3 text-right">REFUND AMOUNT</th>
                <th className="p-3 text-center">METHOD</th>
                <th className="p-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-600">{ret.return_number}</td>
                  <td className="p-3 font-mono font-bold text-slate-700">{ret.invoice_number}</td>
                  <td className="p-3 font-mono text-slate-500">
                    {ret.date} {ret.time}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{ret.customer_name}</td>
                  <td className="p-3 text-slate-600">
                    {ret.items.map((i) => `${i.product_name} (${i.quantity})`).join(', ')}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">
                    {store.currency_symbol}
                    {ret.total_refund.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {ret.refund_method}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedReturnForView(ret)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
                    >
                      <Receipt className="w-3 h-3 text-blue-600" />
                      <span>Voucher</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No returns processed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Return Modal */}
      {showNewReturnModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl p-6 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Process Sale Return / Exchange</h3>
              </div>
              <button
                onClick={() => setShowNewReturnModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Search Invoice */}
            {!matchedSale ? (
              <div className="space-y-4 py-4">
                <p className="text-xs text-slate-600">
                  Enter the original customer invoice number or select from recent completed sales to begin:
                </p>
                <form onSubmit={handleSearchInvoice} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. INV-20261027-0001"
                      value={invoiceQuery}
                      onChange={(e) => setInvoiceQuery(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Find Invoice
                  </button>
                </form>

                <div className="pt-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase mb-2">Recent Completed Invoices:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {sales.filter((s) => s.status === 'completed').slice(0, 6).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setMatchedSale(s);
                          const initState: typeof returnItemsState = {};
                          s.items.forEach((item) => {
                            initState[item.variant_id] = {
                              selected: false,
                              quantity: 1,
                              reason: 'Customer Request / Exchange',
                            };
                          });
                          setReturnItemsState(initState);
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-blue-600 text-xs">{s.invoice_number}</div>
                          <div className="text-[11px] text-slate-600">{s.customer_name} ({s.date})</div>
                        </div>
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {store.currency_symbol}
                          {s.grand_total}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Select Items to Return */
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Invoice Details</span>
                    <span className="font-mono font-bold text-blue-600 text-sm">{matchedSale.invoice_number}</span>
                    <span className="text-slate-600 block">
                      Customer: {matchedSale.customer_name} ({matchedSale.customer_mobile || 'Walk-in'})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Original Total</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {store.currency_symbol}
                      {matchedSale.grand_total}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMatchedSale(null)}
                      className="text-xs text-blue-600 hover:underline block mt-1"
                    >
                      Change Invoice
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-2.5 bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between">
                    <span>Select Items to Return & Restock</span>
                    <span className="text-slate-500 text-[11px] font-normal">Check the items being returned</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <th className="p-2.5 text-center w-10">SELECT</th>
                        <th className="p-2.5">ITEM DESCRIPTION</th>
                        <th className="p-2.5 text-center">SOLD QTY</th>
                        <th className="p-2.5 text-center">RETURN QTY</th>
                        <th className="p-2.5">REASON</th>
                        <th className="p-2.5 text-right">REFUND</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matchedSale.items.map((item) => {
                        const isSelected = !!returnItemsState[item.variant_id]?.selected;
                        const qty = returnItemsState[item.variant_id]?.quantity || 1;
                        const reason = returnItemsState[item.variant_id]?.reason || '';

                        return (
                          <tr
                            key={item.variant_id}
                            className={`hover:bg-slate-50 ${isSelected ? 'bg-blue-50/40' : ''}`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleItem(item.variant_id)}
                                className="rounded text-blue-600"
                              />
                            </td>
                            <td className="p-2.5 font-medium">
                              <div>{item.product_name}</div>
                              <div className="text-[10px] text-slate-400">{item.variant_name}</div>
                            </td>
                            <td className="p-2.5 text-center font-mono">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="1"
                                max={item.quantity}
                                disabled={!isSelected}
                                value={qty}
                                onChange={(e) =>
                                  handleQtyChange(
                                    item.variant_id,
                                    parseInt(e.target.value) || 1,
                                    item.quantity
                                  )
                                }
                                className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono disabled:opacity-40"
                              />
                            </td>
                            <td className="p-2.5">
                              <select
                                disabled={!isSelected}
                                value={reason}
                                onChange={(e) => handleReasonChange(item.variant_id, e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] disabled:opacity-40"
                              >
                                <option value="Customer Request / Exchange">Customer Exchange</option>
                                <option value="Damaged / Defective">Damaged / Defective</option>
                                <option value="Expired Date">Expired Date</option>
                                <option value="Wrong Item Purchased">Wrong Item</option>
                              </select>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                              {isSelected
                                ? `${store.currency_symbol}${(item.unit_selling_price * qty).toLocaleString()}`
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Refund Method & Final Confirmation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Refund Payment Method
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as PaymentMethodType)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    >
                      <option value="cash">Cash In Hand</option>
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="card">Card Refund</option>
                    </select>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-semibold block uppercase">Total Refund Payout</span>
                    <span className="text-2xl font-bold font-mono text-rose-600">
                      {store.currency_symbol}
                      {totalRefund.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNewReturnModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={totalRefund <= 0}
                    onClick={handleSubmitReturn}
                    className="px-6 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                  >
                    Confirm Return & Refund ({store.currency_symbol}{totalRefund})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Voucher Modal */}
      {selectedReturnForView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Return Voucher</h3>
                <p className="text-xs font-mono text-blue-600">{selectedReturnForView.return_number}</p>
              </div>
              <button
                onClick={() => setSelectedReturnForView(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Original Invoice:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReturnForView.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">{selectedReturnForView.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-mono text-slate-700">
                  {selectedReturnForView.date} {selectedReturnForView.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Processed By:</span>
                <span className="text-slate-700">{selectedReturnForView.processed_by}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <th className="p-2.5">ITEM & REASON</th>
                    <th className="p-2.5 text-center">QTY</th>
                    <th className="p-2.5 text-right">REFUND</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedReturnForView.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <div className="font-medium text-slate-800">{it.product_name}</div>
                        <div className="text-[10px] text-slate-400">{it.reason}</div>
                      </td>
                      <td className="p-2.5 text-center font-mono">{it.quantity}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {store.currency_symbol}
                        {it.refund_amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-sm font-bold border-t border-slate-100 pt-3">
              <span>Total Refunded ({selectedReturnForView.refund_method.toUpperCase()}):</span>
              <span className="font-mono text-rose-600">
                {store.currency_symbol}
                {selectedReturnForView.total_refund.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>
              <button
                onClick={() => setSelectedReturnForView(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
