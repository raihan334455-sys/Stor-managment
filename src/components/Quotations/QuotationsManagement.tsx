import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Printer,
  CheckCircle,
  X,
  Trash2,
  Clock,
  ShoppingCart,
  Send,
  Building,
} from 'lucide-react';
import { Quotation, QuotationItem } from '../../types';

export const QuotationsManagement: React.FC = () => {
  const { quotations, products, store, activeUser, setActiveTab, completeSale, addAuditLog, refreshData } = useApp();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQuotationForPrint, setSelectedQuotationForPrint] = useState<Quotation | null>(null);

  // Form State
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [validDays, setValidDays] = useState('15');

  // Items
  interface QuoteRow {
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    unit: string;
  }

  const [items, setItems] = useState<QuoteRow[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedVarId, setSelectedVarId] = useState('');
  const [tempQty, setTempQty] = useState('1');
  const [tempPrice, setTempPrice] = useState('');

  const selectedProduct = products.find((p) => p.id === selectedProdId);

  const handleProductChange = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.variants.length > 0) {
      setSelectedVarId(prod.variants[0].id);
      setTempPrice(prod.variants[0].selling_price.toString());
    } else {
      setSelectedVarId('');
      setTempPrice('');
    }
  };

  const handleVariantChange = (varId: string) => {
    setSelectedVarId(varId);
    if (selectedProduct) {
      const v = selectedProduct.variants.find((v) => v.id === varId);
      if (v) {
        setTempPrice(v.selling_price.toString());
      }
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || !selectedVarId) return;
    const variant = selectedProduct.variants.find((v) => v.id === selectedVarId);
    if (!variant) return;

    const qty = parseFloat(tempQty) || 1;
    const price = parseFloat(tempPrice) || variant.selling_price;

    const existingIdx = items.findIndex((i) => i.variantId === variant.id);
    if (existingIdx !== -1) {
      const updated = [...items];
      updated[existingIdx].quantity += qty;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          productId: selectedProduct.id,
          variantId: variant.id,
          productName: selectedProduct.name,
          variantName: variant.variant_name,
          quantity: qty,
          unitPrice: price,
          discount: 0,
          unit: variant.unit,
        },
      ]);
    }

    setTempQty('1');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const totalDiscount = items.reduce((sum, it) => sum + (it.discount || 0), 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  const handleSaveQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      alert('Please enter customer name');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product item to quotation');
      return;
    }

    const now = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + parseInt(validDays));

    const quoteNo = `QT-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${(quotations.length + 1)
      .toString()
      .padStart(3, '0')}`;

    const quoteItems: QuotationItem[] = items.map((i) => ({
      product_id: i.productId,
      product_name: i.productName,
      variant_id: i.variantId,
      variant_name: i.variantName,
      unit: i.unit as any,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      discount: i.discount,
      total_price: i.quantity * i.unitPrice - i.discount,
    }));

    const newQuotation: Quotation = {
      id: `qt_${Date.now()}`,
      quotation_number: quoteNo,
      customer_name: custName.trim(),
      customer_mobile: custMobile.trim() || '',
      items: quoteItems,
      subtotal,
      discount: totalDiscount,
      grand_total: grandTotal,
      created_by: activeUser.name,
      valid_until: expiry.toISOString().slice(0, 10),
      status: 'draft',
      created_at: now.toISOString(),
    };

    const updated = [newQuotation, ...quotations];
    localStorage.setItem('pos_quotations', JSON.stringify(updated));
    addAuditLog(
      'QUOTATION_CREATED',
      'Quotations',
      `Created Price Quotation #${quoteNo} for ${custName} (Total ৳${grandTotal})`
    );
    refreshData();
    setShowAddModal(false);
    setSelectedQuotationForPrint(newQuotation);
  };

  const handleConvertToSale = (q: Quotation) => {
    if (!confirm(`Convert quotation #${q.quotation_number} into a completed POS sale?`)) {
      return;
    }

    // Convert quotation items to sale items
    const saleItems = q.items.map((it) => ({
      id: `si_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      product_id: it.product_id,
      product_name: it.product_name,
      variant_id: it.variant_id,
      variant_name: it.variant_name,
      sku: 'SKU',
      barcode: 'BARCODE',
      quantity: it.quantity,
      unit: it.unit,
      unit_purchase_price: it.unit_price * 0.8, // Fallback COGS
      unit_selling_price: it.unit_price,
      discount: it.discount,
      total_price: it.total_price,
    }));

    completeSale({
      customer_name: q.customer_name,
      customer_mobile: q.customer_mobile,
      items: saleItems,
      subtotal: q.subtotal,
      discount_amount: q.discount,
      discount_percentage: 0,
      grand_total: q.grand_total,
      paid_amount: q.grand_total,
      due_amount: 0,
      payment_method: 'cash',
      notes: `Converted from Quotation #${q.quotation_number}`,
    });

    // Mark converted
    const updated = quotations.map((item) =>
      item.id === q.id ? { ...item, status: 'converted' as const } : item
    );
    localStorage.setItem('pos_quotations', JSON.stringify(updated));
    refreshData();
    alert(`Quotation #${q.quotation_number} successfully converted to Sale Invoice!`);
  };

  const filteredQuotes = quotations.filter((q) => {
    const term = search.toLowerCase();
    return (
      q.quotation_number.toLowerCase().includes(term) ||
      q.customer_name.toLowerCase().includes(term) ||
      q.customer_mobile.includes(term)
    );
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Price Quotations & Proforma Invoices</span>
          </h1>
          <p className="text-xs text-slate-500">
            Issue official price quotes to clients, set validity periods, and convert them to POS sales with 1 click.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setItems([]);
            setCustName('');
            setCustMobile('');
            if (products.length > 0) handleProductChange(products[0].id);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Price Quotation</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Quotations</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{quotations.length}</div>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">Estimates Issued</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Quoted Value</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {store.currency_symbol}
              {quotations.reduce((sum, q) => sum + q.grand_total, 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">Pipeline Value</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Converted to Sale</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
              {quotations.filter((q) => q.status === 'converted').length}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">Won Orders</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-100">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quotation #, customer, mobile..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredQuotes.length} quotations
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                <th className="p-3">QUOTE #</th>
                <th className="p-3">DATE</th>
                <th className="p-3">CUSTOMER</th>
                <th className="p-3">ITEMS</th>
                <th className="p-3 text-right">TOTAL</th>
                <th className="p-3">VALID UNTIL</th>
                <th className="p-3 text-center">STATUS</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-600">{q.quotation_number}</td>
                  <td className="p-3 font-mono text-slate-600">{q.created_at.slice(0, 10)}</td>
                  <td className="p-3 font-semibold text-slate-800">
                    <div>{q.customer_name}</div>
                    {q.customer_mobile && (
                      <div className="text-[10px] text-slate-400 font-mono">{q.customer_mobile}</div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{q.items.length} item(s)</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {store.currency_symbol}
                    {q.grand_total.toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-slate-600">{q.valid_until}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        q.status === 'converted'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => setSelectedQuotationForPrint(q)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
                    >
                      <Printer className="w-3 h-3 text-blue-600" />
                      <span>Print</span>
                    </button>
                    {q.status !== 'converted' && (
                      <button
                        onClick={() => handleConvertToSale(q)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <ShoppingCart className="w-3 h-3 text-emerald-600" />
                        <span>Convert Sale</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No quotations found. Click "New Price Quotation" to create an estimate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Quotation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl p-6 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Create Price Estimate / Quotation</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Client *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Madina Traders"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / Contact</label>
                  <input
                    type="text"
                    placeholder="018XXXXXXXX"
                    value={custMobile}
                    onChange={(e) => setCustMobile(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quote Validity</label>
                  <select
                    value={validDays}
                    onChange={(e) => setValidDays(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  >
                    <option value="7">Valid for 7 Days</option>
                    <option value="15">Valid for 15 Days</option>
                    <option value="30">Valid for 30 Days</option>
                  </select>
                </div>
              </div>

              {/* Add item row */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                <div className="text-xs font-bold text-blue-900">Add Quoted Products</div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-600 mb-1">Product</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Variant</label>
                    <select
                      value={selectedVarId}
                      onChange={(e) => handleVariantChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      {selectedProduct?.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.variant_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Qty</label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                      <th className="p-2.5">ITEM</th>
                      <th className="p-2.5 text-center">QTY</th>
                      <th className="p-2.5 text-right">UNIT PRICE</th>
                      <th className="p-2.5 text-right">TOTAL</th>
                      <th className="p-2.5 text-center">REMOVE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium">
                          {it.productName} - {it.variantName}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          {store.currency_symbol}
                          {it.unitPrice}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {store.currency_symbol}
                          {(it.quantity * it.unitPrice).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          No items added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold">Total Quoted Amount:</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {store.currency_symbol}
                  {grandTotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                >
                  Save & Print Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Proforma View */}
      {selectedQuotationForPrint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Official Price Quotation</h3>
                <p className="text-xs font-mono text-blue-600">{selectedQuotationForPrint.quotation_number}</p>
              </div>
              <button
                onClick={() => setSelectedQuotationForPrint(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center pb-2 border-b border-slate-200">
              <h2 className="font-bold text-lg text-slate-900">{store.store_name}</h2>
              <p className="text-xs text-slate-500">{store.store_address}</p>
              <p className="text-xs text-slate-500">Mobile: {store.store_mobile}</p>
            </div>

            <div className="text-xs bg-slate-50 p-3 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Quotation For:</span>
                <span className="font-bold">{selectedQuotationForPrint.customer_name}</span>
              </div>
              {selectedQuotationForPrint.customer_mobile && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono">{selectedQuotationForPrint.customer_mobile}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Valid Until:</span>
                <span className="font-mono text-rose-600 font-semibold">{selectedQuotationForPrint.valid_until}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <th className="p-2">ITEM</th>
                    <th className="p-2 text-center">QTY</th>
                    <th className="p-2 text-right">UNIT PRICE</th>
                    <th className="p-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedQuotationForPrint.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium">{it.product_name} - {it.variant_name}</td>
                      <td className="p-2 text-center font-mono">{it.quantity} {it.unit}</td>
                      <td className="p-2 text-right font-mono">{store.currency_symbol}{it.unit_price}</td>
                      <td className="p-2 text-right font-mono font-bold">
                        {store.currency_symbol}{it.total_price.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-sm font-bold border-t border-slate-100 pt-3">
              <span>Grand Total:</span>
              <span className="font-mono text-blue-600 text-base">
                {store.currency_symbol}
                {selectedQuotationForPrint.grand_total.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Proforma</span>
              </button>
              <button
                onClick={() => setSelectedQuotationForPrint(null)}
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
