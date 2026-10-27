import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  AlertCircle,
  X,
  Printer,
  ChevronRight,
  FileText,
  Clock,
  Trash2,
} from 'lucide-react';
import { Purchase, PurchaseItem, PaymentMethodType } from '../../types';

export const PurchasesManagement: React.FC = () => {
  const { purchases, suppliers, products, store, addPurchase, activeUser } = useApp();

  const [search, setSearch] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for Stock Inward
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [notes, setNotes] = useState('');

  // Items table
  interface NewItemRow {
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity: number;
    purchasePrice: number;
    unit: string;
    batchNumber?: string;
    expiryDate?: string;
  }

  const [items, setItems] = useState<NewItemRow[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedVarId, setSelectedVarId] = useState('');
  const [tempQty, setTempQty] = useState('1');
  const [tempCost, setTempCost] = useState('');
  const [tempBatch, setTempBatch] = useState('');
  const [tempExpiry, setTempExpiry] = useState('');

  // Selected product variants helper
  const selectedProduct = products.find((p) => p.id === selectedProdId);

  const handleProductChange = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.variants.length > 0) {
      setSelectedVarId(prod.variants[0].id);
      setTempCost(prod.variants[0].purchase_price.toString());
    } else {
      setSelectedVarId('');
      setTempCost('');
    }
  };

  const handleVariantChange = (varId: string) => {
    setSelectedVarId(varId);
    if (selectedProduct) {
      const v = selectedProduct.variants.find((v) => v.id === varId);
      if (v) {
        setTempCost(v.purchase_price.toString());
      }
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || !selectedVarId) return;
    const variant = selectedProduct.variants.find((v) => v.id === selectedVarId);
    if (!variant) return;

    const qty = parseFloat(tempQty) || 0;
    const cost = parseFloat(tempCost) || 0;
    if (qty <= 0) return;

    // Check if item already exists in table
    const existingIndex = items.findIndex((i) => i.variantId === variant.id);
    if (existingIndex !== -1) {
      const updated = [...items];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].purchasePrice = cost;
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
          purchasePrice: cost,
          unit: variant.unit,
          batchNumber: tempBatch.trim() || undefined,
          expiryDate: tempExpiry || undefined,
        },
      ]);
    }

    // Reset row inputs
    setTempQty('1');
    setTempBatch('');
    setTempExpiry('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
  const discount = parseFloat(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const numericPaid = parseFloat(paidAmount) || 0;
  const dueAmount = Math.max(0, grandTotal - numericPaid);

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Please select a supplier.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product to the purchase inward.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;

    const purchaseItems: PurchaseItem[] = items.map((i) => ({
      id: `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      product_id: i.productId,
      product_name: i.productName,
      variant_id: i.variantId,
      variant_name: i.variantName,
      quantity: i.quantity,
      unit: i.unit as any,
      purchase_price: i.purchasePrice,
      total_cost: i.quantity * i.purchasePrice,
      batch_number: i.batchNumber,
      expiry_date: i.expiryDate,
    }));

    addPurchase({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_invoice_no: supplierInvoiceNo.trim() || undefined,
      purchase_date: purchaseDate,
      items: purchaseItems,
      subtotal,
      discount,
      tax: 0,
      grand_total: grandTotal,
      paid_amount: numericPaid,
      due_amount: dueAmount,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      created_by: activeUser.name,
      sync_status: 'pending',
      branch_id: store.branch_id,
    });

    // Reset and close
    setShowAddModal(false);
    setItems([]);
    setSupplierId('');
    setSupplierInvoiceNo('');
    setPaidAmount('');
    setDiscountAmount('0');
    setNotes('');
  };

  // Filter purchases
  const filteredPurchases = purchases.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.purchase_number.toLowerCase().includes(q) ||
      p.supplier_name.toLowerCase().includes(q) ||
      (p.supplier_invoice_no && p.supplier_invoice_no.toLowerCase().includes(q))
    );
  });

  const totalPurchasesCost = purchases.reduce((sum, p) => sum + p.grand_total, 0);
  const totalPaidToSuppliers = purchases.reduce((sum, p) => sum + p.paid_amount, 0);
  const totalPendingDue = purchases.reduce((sum, p) => sum + p.due_amount, 0);

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Supplier Purchases & Stock Inward</span>
          </h1>
          <p className="text-xs text-slate-500">
            Record batch purchase invoices, restock variants, and manage vendor payables.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            if (suppliers.length > 0 && !supplierId) {
              setSupplierId(suppliers[0].id);
            }
            if (products.length > 0 && !selectedProdId) {
              handleProductChange(products[0].id);
            }
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Inward</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Purchases (All Time)</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {store.currency_symbol}
              {totalPurchasesCost.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">
              {purchases.length} Inward Invoices
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Paid to Suppliers</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
              {store.currency_symbol}
              {totalPaidToSuppliers.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">Cleared Amount</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Accounts Payable (Due)</span>
            <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
              {store.currency_symbol}
              {totalPendingDue.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-600 font-semibold mt-1 inline-block">
              Vendor Pending Liability
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search purchase #, supplier, or invoice..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredPurchases.length} of {purchases.length} purchases
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                <th className="p-3">PURCHASE #</th>
                <th className="p-3">DATE</th>
                <th className="p-3">SUPPLIER</th>
                <th className="p-3">ITEMS</th>
                <th className="p-3 text-right">TOTAL</th>
                <th className="p-3 text-right">PAID</th>
                <th className="p-3 text-right">DUE</th>
                <th className="p-3 text-center">METHOD</th>
                <th className="p-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.map((pur) => (
                <tr key={pur.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-600">{pur.purchase_number}</td>
                  <td className="p-3 text-slate-600 font-mono">{pur.purchase_date}</td>
                  <td className="p-3 font-semibold text-slate-800">
                    <div>{pur.supplier_name}</div>
                    {pur.supplier_invoice_no && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Ref: #{pur.supplier_invoice_no}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{pur.items.length} item(s)</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {store.currency_symbol}
                    {pur.grand_total.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                    {store.currency_symbol}
                    {pur.paid_amount.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-600 font-semibold">
                    {pur.due_amount > 0 ? `${store.currency_symbol}${pur.due_amount.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {pur.payment_method}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedPurchase(pur)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
                    >
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No purchase inward records found. Click "New Stock Inward" to add stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl text-slate-800">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">New Supplier Stock Inward</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Supplier and Date row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.company_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Invoice / Challan #</label>
                  <input
                    type="text"
                    placeholder="e.g. CH-99021"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                  </input>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Add Item Line Builder */}
              <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Add Product Items to Inward</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Variant</label>
                    <select
                      value={selectedVarId}
                      onChange={(e) => handleVariantChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    >
                      {selectedProduct?.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.variant_name} ({v.stock_quantity} in stock)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Qty</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cost ({store.currency_symbol})</label>
                    <input
                      type="number"
                      step="any"
                      value={tempCost}
                      onChange={(e) => setTempCost(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Batch / Lot Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. BATCH-2026-X"
                      value={tempBatch}
                      onChange={(e) => setTempBatch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      value={tempExpiry}
                      onChange={(e) => setTempExpiry(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="p-2.5">PRODUCT & VARIANT</th>
                      <th className="p-2.5 text-center">QTY</th>
                      <th className="p-2.5 text-right">UNIT COST</th>
                      <th className="p-2.5 text-right">TOTAL</th>
                      <th className="p-2.5 text-center">BATCH / EXPIRY</th>
                      <th className="p-2.5 text-center">REMOVE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-800">
                          {item.productName} - <span className="text-slate-500">{item.variantName}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {store.currency_symbol}
                          {item.purchasePrice}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {store.currency_symbol}
                          {(item.quantity * item.purchasePrice).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center text-[11px] text-slate-500 font-mono">
                          {item.batchNumber || '-'} / {item.expiryDate || '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          No items added yet. Use the selector above to add products.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary and Payment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    >
                      <option value="cash">Cash In Hand</option>
                      <option value="bkash">bKash Merchant</option>
                      <option value="nagad">Nagad</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Card / POS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Inward Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Delivered by goods truck #12, checked and verified"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">
                      {store.currency_symbol}
                      {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Supplier Discount:</span>
                    <div className="flex items-center gap-1 w-32">
                      <span className="text-slate-400">{store.currency_symbol}</span>
                      <input
                        type="number"
                        step="any"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-right text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2">
                    <span>Grand Total:</span>
                    <span className="font-mono">
                      {store.currency_symbol}
                      {grandTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-emerald-700">Paid Now:</span>
                    <div className="flex items-center gap-1 w-32">
                      <span className="text-slate-400">{store.currency_symbol}</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-full bg-white border border-emerald-400 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-xs text-amber-700 border-t border-slate-200 pt-1">
                    <span>Remaining Due (Accounts Payable):</span>
                    <span className="font-mono">
                      {store.currency_symbol}
                      {dueAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  Confirm & Inward Stock ({items.length} items)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Purchase Invoice {selectedPurchase.purchase_number}
                </h3>
                <p className="text-xs text-slate-500 font-mono">Date: {selectedPurchase.purchase_date}</p>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-400 block">Supplier</span>
                <span className="font-bold text-slate-800">{selectedPurchase.supplier_name}</span>
                {selectedPurchase.supplier_invoice_no && (
                  <span className="block text-[11px] text-slate-500">Challan #{selectedPurchase.supplier_invoice_no}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Payment Method & Status</span>
                <span className="font-bold uppercase text-slate-800">{selectedPurchase.payment_method}</span>
                <span className={`block font-bold ${selectedPurchase.due_amount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {selectedPurchase.due_amount > 0 ? `Due: ${store.currency_symbol}${selectedPurchase.due_amount}` : 'Fully Paid'}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <th className="p-2.5">ITEM</th>
                    <th className="p-2.5 text-center">QTY</th>
                    <th className="p-2.5 text-right">UNIT PRICE</th>
                    <th className="p-2.5 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPurchase.items.map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-medium">
                        {it.product_name} - {it.variant_name}
                        {it.batch_number && (
                          <span className="block text-[10px] text-slate-400">Batch: {it.batch_number}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        {store.currency_symbol}
                        {it.purchase_price}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {store.currency_symbol}
                        {it.total_cost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
              <div className="text-slate-500">Recorded by: {selectedPurchase.created_by}</div>
              <div className="text-right font-bold text-sm">
                Grand Total: {store.currency_symbol}
                {selectedPurchase.grand_total.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedPurchase(null)}
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
