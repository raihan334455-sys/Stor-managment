import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  PauseCircle,
  PlayCircle,
  Receipt,
  CreditCard,
  User,
  UserPlus,
  Scale,
  Sparkles,
  AlertTriangle,
  X,
  Check,
  Percent,
  Banknote,
  Smartphone,
  Building,
  Tag,
  FileText,
} from 'lucide-react';
import {
  Product,
  ProductVariant,
  CartItem,
  Customer,
  PaymentMethodType,
  SplitPaymentDetail,
} from '../../types';

export const POSView: React.FC = () => {
  const {
    products,
    categories,
    customers,
    store,
    completeSale,
    heldCarts,
    setHeldCarts,
    saveCustomer,
    activeUser,
  } = useApp();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

  // Quick Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustMobile, setNewCustMobile] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');

  // Discount State
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [discountVal, setDiscountVal] = useState<number>(0);
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);

  // Weight / Quantity Edit Modal
  const [selectedCartIndex, setSelectedCartIndex] = useState<number | null>(null);
  const [customQtyInput, setCustomQtyInput] = useState<string>('1');
  const [showWeightModal, setShowWeightModal] = useState<boolean>(false);

  // Held Bills Modal
  const [showHeldModal, setShowHeldModal] = useState<boolean>(false);
  const [holdNote, setHoldNote] = useState<string>('');

  // Payment / Checkout Modal
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [splitDetails, setSplitDetails] = useState<SplitPaymentDetail>({ cash: 0, bkash: 0 });
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Barcode Auto-Focus Ref
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Filter Active Products & Flatten Variants
  const activeProducts = products.filter((p) => !p.archived);

  // Extract all searchable variants with their parent product info
  const allVariants = activeProducts.flatMap((p) =>
    p.variants
      .filter((v) => v.active)
      .map((v) => ({
        ...v,
        product_name: p.name,
        category_id: p.category_id,
        image: p.image,
      }))
  );

  const filteredVariants = allVariants.filter((v) => {
    const matchesCategory =
      selectedCategoryId === 'all' || v.category_id === selectedCategoryId;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      v.product_name.toLowerCase().includes(q) ||
      v.variant_name.toLowerCase().includes(q) ||
      v.barcode.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  // Handle Barcode Auto-Scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search exact barcode match first
    const exactMatch = allVariants.find(
      (v) => v.barcode.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setSearchQuery('');
    }
  };

  // Add Item to Cart
  const addToCart = (variant: (typeof allVariants)[0]) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.variant_id === variant.id);
      if (idx !== -1) {
        const updated = [...prev];
        const newQty = updated[idx].quantity + 1;
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          total_price: Math.round(newQty * updated[idx].selling_price * 100) / 100,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          product_id: variant.product_id,
          product_name: variant.product_name,
          variant_id: variant.id,
          variant_name: variant.variant_name,
          sku: variant.sku,
          barcode: variant.barcode,
          unit: variant.unit,
          purchase_price: variant.purchase_price,
          selling_price: variant.selling_price,
          quantity: 1,
          max_stock: variant.stock_quantity,
          item_discount: 0,
          total_price: variant.selling_price,
        };
        return [...prev, newItem];
      }
    });
  };

  // Update Cart Quantity
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: Math.round(newQty * 1000) / 1000,
        total_price:
          Math.round(newQty * updated[index].selling_price * 100) / 100 -
          updated[index].item_discount,
      };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.total_price, 0);

  let calculatedDiscount = 0;
  if (discountType === 'percentage') {
    calculatedDiscount = Math.round((subtotal * discountVal) / 100);
  } else {
    calculatedDiscount = Math.min(subtotal, discountVal);
  }

  const grandTotal = Math.max(0, subtotal - calculatedDiscount);

  // Previous Due for Selected Customer
  const previousDue = selectedCustomer ? selectedCustomer.total_due_amount : 0;
  const totalOutstanding = grandTotal + previousDue;

  // Handle Customer Select
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerSearch(`${cust.name} (${cust.mobile})`);
    setShowCustomerDropdown(false);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile) return;
    const created = saveCustomer({
      id: `cust_${Date.now()}`,
      name: newCustName,
      mobile: newCustMobile,
      address: newCustAddress,
      customer_type: 'regular',
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
    setSelectedCustomer(created);
    setCustomerSearch(`${created.name} (${created.mobile})`);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustMobile('');
    setNewCustAddress('');
  };

  // Hold Current Bill
  const handleHoldBill = () => {
    if (cartItems.length === 0) return;
    const newHold = {
      id: `hold_${Date.now()}`,
      customer_name: selectedCustomer ? selectedCustomer.name : 'Walk-in',
      customer_mobile: selectedCustomer ? selectedCustomer.mobile : '',
      items: cartItems,
      note: holdNote || 'Held at POS Terminal',
      held_at: new Date().toLocaleTimeString(),
      held_by: activeUser.name,
    };
    setHeldCarts([newHold, ...heldCarts]);
    setCartItems([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setHoldNote('');
  };

  // Resume Held Bill
  const handleResumeBill = (heldId: string) => {
    const held = heldCarts.find((h) => h.id === heldId);
    if (!held) return;
    setCartItems(held.items);
    if (held.customer_mobile) {
      const match = customers.find((c) => c.mobile === held.customer_mobile);
      if (match) {
        setSelectedCustomer(match);
        setCustomerSearch(`${match.name} (${match.mobile})`);
      }
    }
    setHeldCarts(heldCarts.filter((h) => h.id !== heldId));
    setShowHeldModal(false);
  };

  // Open Payment Modal
  const handleOpenPayment = () => {
    if (cartItems.length === 0) return;
    setPaidAmountInput(grandTotal.toString());
    setShowPaymentModal(true);
  };

  // Submit Final Sale
  const handleFinalCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const paidNum = parseFloat(paidAmountInput) || 0;
    const dueNum = Math.max(0, grandTotal - paidNum);

    const saleItems = cartItems.map((ci) => ({
      id: `sitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      product_id: ci.product_id,
      product_name: ci.product_name,
      variant_id: ci.variant_id,
      variant_name: ci.variant_name,
      sku: ci.sku,
      barcode: ci.barcode,
      quantity: ci.quantity,
      unit: ci.unit,
      unit_purchase_price: ci.purchase_price,
      unit_selling_price: ci.selling_price,
      discount: ci.item_discount,
      total_price: ci.total_price,
    }));

    completeSale({
      customer_id: selectedCustomer ? selectedCustomer.id : undefined,
      customer_name: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customer_mobile: selectedCustomer ? selectedCustomer.mobile : '',
      items: saleItems,
      subtotal,
      discount_amount: calculatedDiscount,
      discount_percentage: discountType === 'percentage' ? discountVal : 0,
      grand_total: grandTotal,
      paid_amount: paidNum,
      due_amount: dueNum,
      payment_method: paymentMethod,
      split_details: paymentMethod === 'split' ? splitDetails : undefined,
      notes: paymentNotes,
    });

    // Reset POS view state
    setCartItems([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setDiscountVal(0);
    setShowPaymentModal(false);
    setPaymentNotes('');
  };

  // Filter Customers for Autocomplete
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch)
  );

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden select-none text-slate-800">
      {/* LEFT / CENTER: PRODUCT & VARIANT CATALOG GRID */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden border-r border-slate-200">
        {/* Top Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
          {/* Search & Barcode Scan Input */}
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Scan Barcode or Search Product (Name, Barcode, SKU)..."
              className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 rounded-xl pl-10 pr-16 py-2 text-xs focus:outline-none transition-all shadow-sm"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <Barcode className="w-3.5 h-3.5 text-blue-600" />
              <span>SCAN</span>
            </div>
          </form>

          {/* Held Bills Counter */}
          {heldCarts.length > 0 && (
            <button
              onClick={() => setShowHeldModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              <PauseCircle className="w-4 h-4 text-amber-600" />
              <span>
                Held Queue ({heldCarts.length})
              </span>
            </button>
          )}
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none shrink-0">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategoryId === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategoryId === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Variant Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pr-1">
          {filteredVariants.map((variant) => {
            const isOutOfStock = variant.stock_quantity <= 0;
            const isLowStock = variant.stock_quantity <= variant.min_stock_level && !isOutOfStock;

            return (
              <button
                key={variant.id}
                disabled={isOutOfStock}
                onClick={() => addToCart(variant)}
                className={`group relative bg-white border rounded-xl p-3 text-left flex flex-col justify-between transition-all shadow-sm ${
                  isOutOfStock
                    ? 'opacity-50 border-slate-200 cursor-not-allowed bg-slate-50'
                    : 'border-slate-200 hover:border-blue-500 hover:shadow-md'
                }`}
              >
                {/* Variant Header Info */}
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider line-clamp-1">
                      {variant.barcode}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isOutOfStock ? 'OUT' : `${variant.stock_quantity} ${variant.unit}`}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                    {variant.product_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                    {variant.variant_name}
                  </p>
                </div>

                {/* Price & Unit Footer */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900 font-mono">
                    {store.currency_symbol}
                    {variant.selling_price}
                    <span className="text-[10px] font-normal text-slate-500">/{variant.unit}</span>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-600 transition-all">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            );
          })}

          {filteredVariants.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Search className="w-10 h-10 mb-2 text-slate-400" />
              <p className="text-sm font-semibold">No products found</p>
              <p className="text-xs text-slate-500 mt-1">Try another search term or filter category</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CART & CHECKOUT CONTROLLER */}
      <div className="w-full xl:w-[420px] 2xl:w-[460px] bg-white border-l border-slate-200 flex flex-col h-full shrink-0">
        {/* Customer Selection Header */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Select or Search Customer (Mobile / Name)..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
              {selectedCustomer && (
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-blue-600 rounded-lg transition-colors shrink-0 shadow-sm"
              title="Add New Customer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Customer Dropdown Results */}
          {showCustomerDropdown && customerSearch.trim().length > 0 && (
            <div className="absolute left-3 right-3 top-12 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="w-full p-2.5 text-left hover:bg-slate-50 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{c.name}</div>
                    <div className="text-[10px] text-slate-500">{c.mobile}</div>
                  </div>
                  {c.total_due_amount > 0 && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                      Due: ৳{c.total_due_amount}
                    </span>
                  )}
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-500">No matching customer found</div>
              )}
            </div>
          )}

          {/* Previous Customer Due Banner */}
          {selectedCustomer && selectedCustomer.total_due_amount > 0 && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-800 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold">PREVIOUS DUE: </span>
                  <span className="font-mono font-bold text-sm">৳{selectedCustomer.total_due_amount}</span>
                </div>
              </div>
              <span className="text-[10px] text-rose-600 font-semibold">Auto-Calculated</span>
            </div>
          )}
        </div>

        {/* Selected Items Cart Table */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
          {cartItems.map((item, idx) => (
            <div
              key={idx}
              className="pt-2 first:pt-0 flex items-center justify-between gap-2 hover:bg-slate-50/80 p-2 rounded-lg transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">{item.product_name}</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {item.variant_name} • {store.currency_symbol}
                  {item.selling_price}/{item.unit}
                </div>
              </div>

              {/* Quantity Controls & Decimal Edit */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQuantity(idx, item.quantity - 1)}
                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200"
                >
                  <Minus className="w-3 h-3" />
                </button>

                <button
                  onClick={() => {
                    setSelectedCartIndex(idx);
                    setCustomQtyInput(item.quantity.toString());
                    setShowWeightModal(true);
                  }}
                  className="px-2 py-0.5 bg-slate-50 border border-slate-200 hover:border-blue-500 text-blue-700 font-mono font-bold text-xs rounded min-w-[44px] text-center"
                  title="Click to enter weight or decimal quantity"
                >
                  {item.quantity} {item.unit}
                </button>

                <button
                  onClick={() => updateQuantity(idx, item.quantity + 1)}
                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Item Price Total */}
              <div className="text-right min-w-[65px]">
                <div className="font-bold text-xs text-slate-800 font-mono">
                  {store.currency_symbol}
                  {item.total_price}
                </div>
                <button
                  onClick={() => removeFromCart(idx)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cartItems.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <Receipt className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">Cart is empty</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Scan barcode or click items to add</p>
            </div>
          )}
        </div>

        {/* CART SUMMARY & CHECKOUT BUTTONS */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {/* Subtotal & Discount Row */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-slate-800">
                {store.currency_symbol}
                {subtotal}
              </span>
            </div>

            <div className="flex justify-between items-center text-emerald-700">
              <button
                onClick={() => setShowDiscountModal(true)}
                className="underline hover:text-emerald-800 flex items-center gap-1 font-medium"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>
                  Discount {discountVal > 0 ? `(${discountVal}${discountType === 'percentage' ? '%' : store.currency_symbol})` : ''}:
                </span>
              </button>
              <span className="font-mono font-bold">
                -{store.currency_symbol}
                {calculatedDiscount}
              </span>
            </div>

            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>GRAND TOTAL:</span>
              <span className="font-mono text-blue-700 text-lg">
                {store.currency_symbol}
                {grandTotal}
              </span>
            </div>

            {selectedCustomer && selectedCustomer.total_due_amount > 0 && (
              <div className="flex justify-between text-xs text-rose-700 font-medium pt-1">
                <span>Total Outstanding (+Previous Due):</span>
                <span className="font-mono font-bold">
                  {store.currency_symbol}
                  {totalOutstanding}
                </span>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              disabled={cartItems.length === 0}
              onClick={handleHoldBill}
              className="py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 shadow-sm"
            >
              <PauseCircle className="w-4 h-4 text-amber-600" />
              <span>Hold Bill</span>
            </button>

            <button
              disabled={cartItems.length === 0}
              onClick={() => setCartItems([])}
              className="py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 shadow-sm"
            >
              <Trash2 className="w-4 h-4 text-slate-500" />
              <span>Clear Cart</span>
            </button>
          </div>

          {/* Pay Button */}
          <button
            disabled={cartItems.length === 0}
            onClick={handleOpenPayment}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <Banknote className="w-4 h-4" />
            <span>PAY ({store.currency_symbol}{grandTotal})</span>
          </button>
        </div>
      </div>

      {/* WEIGHT & DECIMAL QUANTITY MODAL */}
      {showWeightModal && selectedCartIndex !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Weight / Decimal Quantity</h3>
              </div>
              <button
                onClick={() => setShowWeightModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              Enter exact weight for loose products (e.g. 0.250 Kg, 0.750 Kg, 1.5 Kg):
            </p>

            {/* Quick Weight Presets */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['0.25', '0.5', '0.75', '1', '1.5', '2.5'].map((w) => (
                <button
                  key={w}
                  onClick={() => setCustomQtyInput(w)}
                  className="py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 text-xs font-mono font-bold rounded-xl text-slate-700 hover:text-blue-700 transition-colors"
                >
                  {w} {cartItems[selectedCartIndex]?.unit}
                </button>
              ))}
            </div>

            <input
              type="number"
              step="0.001"
              value={customQtyInput}
              onChange={(e) => setCustomQtyInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-center text-xl font-mono text-blue-600 focus:outline-none focus:border-blue-500 mb-4"
            />

            <button
              onClick={() => {
                const val = parseFloat(customQtyInput) || 1;
                updateQuantity(selectedCartIndex, val);
                setShowWeightModal(false);
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow transition-colors"
            >
              Apply Weight Quantity
            </button>
          </div>
        </div>
      )}

      {/* DISCOUNT MODAL */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Apply Sale Discount</h3>
              </div>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 my-4">
              <button
                onClick={() => setDiscountType('percentage')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                  discountType === 'percentage'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Percentage (%)
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                  discountType === 'fixed'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Fixed ({store.currency_symbol})
              </button>
            </div>

            <input
              type="number"
              value={discountVal}
              onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
              placeholder="Enter discount value..."
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-center text-xl font-mono text-blue-600 focus:outline-none focus:border-blue-500 mb-4"
            />

            <button
              onClick={() => setShowDiscountModal(false)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow transition-colors"
            >
              Apply Discount
            </button>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Register New Customer</h3>
              </div>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Rahim Ahmed"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address (Optional)</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. House 42, Road 5, Mirpur, Dhaka"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-colors"
                >
                  Save & Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HELD BILLS DRAWER MODAL */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-800">Held Bills Queue</h3>
              </div>
              <button
                onClick={() => setShowHeldModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 my-4 max-h-72 overflow-y-auto">
              {heldCarts.map((h) => (
                <div
                  key={h.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Customer: {h.customer_name} {h.customer_mobile && `(${h.customer_mobile})`}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Items: {h.items.length} • Held at: {h.held_at}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResumeBill(h.id)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT & PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Complete Sale Payment</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFinalCheckout} className="space-y-4 mt-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Grand Total</div>
                  <div className="text-xl font-bold font-mono text-blue-700">
                    {store.currency_symbol}
                    {grandTotal}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Customer</div>
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Payment Method:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'bkash', label: 'bKash', icon: Smartphone },
                    { id: 'nagad', label: 'Nagad', icon: Smartphone },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'bank', label: 'Bank', icon: Building },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethodType)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white shadow'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paid Amount Input & Due Calculation */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-700 mb-1 font-medium">
                    <span>Amount Received:</span>
                    <button
                      type="button"
                      onClick={() => setPaidAmountInput(grandTotal.toString())}
                      className="text-blue-600 underline hover:text-blue-800 text-[11px]"
                    >
                      Exact Total ({store.currency_symbol}
                      {grandTotal})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-center text-2xl font-mono text-blue-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Due Calculation Display */}
                {parseFloat(paidAmountInput) < grandTotal && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between font-bold">
                    <span>CUSTOMER DUE AMOUNT:</span>
                    <span className="font-mono text-base text-rose-700">
                      {store.currency_symbol}
                      {(grandTotal - (parseFloat(paidAmountInput) || 0)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-colors"
                >
                  Confirm & Print Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
