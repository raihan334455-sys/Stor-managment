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
  ShoppingCart,
  ChevronRight,
  Package,
  BellRing,
  Calendar,
  QrCode,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  Product,
  ProductVariant,
  CartItem,
  Customer,
  PaymentMethodType,
  SplitPaymentDetail,
  Sale,
  PackagingUnitConfig,
} from '../../types';
import { DueAlertModal } from '../Customers/DueAlertModal';
import { QrBarcodeScannerModal, ScanResultFeedback } from '../Scanner/QrBarcodeScannerModal';
import { getMobilePurchaseStats } from '../../utils/customerPurchaseStats';
import {
  isCategoryEnabled,
  isGeneralProductModuleEnabled,
  isMedicineModuleEnabled,
  isProductEnabled,
} from '../../utils/modules';
import {
  getVariantBaseUnit,
  getVariantPackagingOptions,
  findPackagingByBarcode,
  getVariantBatches,
  getPreferredBatchForSale,
  getDaysUntilExpiry,
  formatStockBreakdown,
  getBasePackagingPriceOption,
} from '../../utils/packaging';

export const POSView: React.FC = () => {
  const {
    products,
    categories,
    customers,
    sales,
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
  const [typeFilter, setTypeFilter] = useState<'all' | 'general' | 'medicine'>('all');

  // Mobile / Tablet Cart Drawer State
  const [isCartOpenMobile, setIsCartOpenMobile] = useState<boolean>(false);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

  // Quick Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [pendingDueCheckout, setPendingDueCheckout] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustMobile, setNewCustMobile] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');
  const [newCustEmail, setNewCustEmail] = useState<string>('');
  const [newCustPromiseDate, setNewCustPromiseDate] = useState<string>('');

  // Post-Sale Due Alert Quick Banner & Modal
  const [recentDueSaleAlert, setRecentDueSaleAlert] = useState<{
    customer: Customer;
    invoiceNumber: string;
    dueAmount: number;
  } | null>(null);
  const [dueAlertTarget, setDueAlertTarget] = useState<{
    customer: Customer;
    invoiceNumber?: string;
  } | null>(null);

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

  // Barcode Auto-Focus Ref & QR/Barcode Scanner Modal
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [scanFeedback, setScanFeedback] = useState<ScanResultFeedback | null>(null);

  // Variant / Packaging / Batch Selection Modal
  const [posSelectModal, setPosSelectModal] = useState<{
    product: Product;
    initialVariantId: string;
  } | null>(null);
  const [modalVariantId, setModalVariantId] = useState<string>('');
  const [modalPkgId, setModalPkgId] = useState<string>('');
  const [modalBatchNo, setModalBatchNo] = useState<string>('');
  const [modalQty, setModalQty] = useState<string>('1');

  useEffect(() => {
    if (!scanFeedback) return;
    const t = setTimeout(() => setScanFeedback(null), 4500);
    return () => clearTimeout(t);
  }, [scanFeedback]);

  const isBn = store.language === 'bn';
  const medEnabled = isMedicineModuleEnabled(store);
  const genEnabled = isGeneralProductModuleEnabled(store);
  const visibleCategories = categories.filter((c) => {
    if (!isCategoryEnabled(c, store)) return false;
    if (medEnabled && genEnabled) {
      if (typeFilter === 'general' && c.id === 'cat_medicine') return false;
      if (typeFilter === 'medicine' && c.id === 'cat_general') return false;
    }
    return true;
  });

  // Filter Active Products & Flatten Variants (respecting enabled modules)
  const activeProducts = products.filter(
    (p) => !p.archived && p.active !== false && isProductEnabled(p, store)
  );

  // Extract all searchable variants with their parent product info
  const allVariants = activeProducts.flatMap((p) =>
    p.variants
      .filter((v) => v.active)
      .map((v) => ({
        ...v,
        product_name: p.name,
        category_id: p.category_id,
        image: p.image,
        generic_name: p.generic_name,
        brand_name: p.brand_name,
        company_name: p.company_name,
        medicine_type: p.medicine_type,
        strength: v.strength || p.strength,
        rack_number: p.rack_number,
        is_medicine: p.is_medicine,
      }))
  );

  const filteredVariants = allVariants.filter((v) => {
    const matchesType =
      !(medEnabled && genEnabled) ||
      typeFilter === 'all' ||
      (typeFilter === 'medicine' ? Boolean(v.is_medicine) : !v.is_medicine);
    const matchesCategory =
      selectedCategoryId === 'all' || v.category_id === selectedCategoryId;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      v.product_name.toLowerCase().includes(q) ||
      v.variant_name.toLowerCase().includes(q) ||
      v.barcode.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q) ||
      (medEnabled && (v.generic_name || '').toLowerCase().includes(q)) ||
      (v.brand_name || '').toLowerCase().includes(q) ||
      (medEnabled && (v.company_name || '').toLowerCase().includes(q)) ||
      (medEnabled && (v.strength || '').toLowerCase().includes(q)) ||
      (medEnabled && (v.medicine_type || '').toLowerCase().includes(q)) ||
      (v.rack_number || '').toLowerCase().includes(q) ||
      (medEnabled && (v.batch_number || '').toLowerCase().includes(q)) ||
      (v.packaging_units || []).some((pu) => (pu.barcode || '').toLowerCase().includes(q)) ||
      (v.batches || []).some((b) => b.batch_number.toLowerCase().includes(q));
    return matchesType && matchesCategory && matchesQuery;
  });

  // Extract barcode/SKU candidates from plain barcode/SKU text, JSON QR, or URL QR
  const extractScannedCandidates = (raw: string): string[] => {
    const trimmed = raw.trim();
    const candidates: string[] = [trimmed];
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        for (const k of ['barcode', 'sku', 'code', 'id']) {
          if (typeof parsed?.[k] === 'string' && parsed[k].trim()) {
            candidates.unshift(parsed[k].trim());
          }
        }
      } catch {
        // Not JSON
      }
    }
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        for (const k of ['barcode', 'sku', 'code', 'q']) {
          const val = url.searchParams.get(k);
          if (val?.trim()) candidates.unshift(val.trim());
        }
      } catch {
        // Not valid URL
      }
    }
    return Array.from(new Set(candidates));
  };

  // Base-unit stock usage helpers across current cart lines
  const getCartVariantBaseUsed = (items: CartItem[], variantId: string, excludeIndex?: number): number =>
    items.reduce((sum, ci, idx) => {
      if (idx === excludeIndex || ci.variant_id !== variantId) return sum;
      return sum + ci.quantity * (ci.conversion_factor || 1);
    }, 0);

  const getCartBatchBaseUsed = (
    items: CartItem[],
    variantId: string,
    batchNumber: string,
    excludeIndex?: number
  ): number =>
    items.reduce((sum, ci, idx) => {
      if (
        idx === excludeIndex ||
        ci.variant_id !== variantId ||
        (ci.batch_number || '').toLowerCase() !== batchNumber.toLowerCase()
      ) {
        return sum;
      }
      return sum + ci.quantity * (ci.conversion_factor || 1);
    }, 0);

  // Add Item with specific Variant, Packaging Tier & Batch Lot
  const addConfiguredItemToCart = (
    variant: ProductVariant & { product_name?: string },
    pkg: PackagingUnitConfig,
    batchNo?: string,
    expiryDate?: string,
    qtyToAdd: number = 1
  ): boolean => {
    const baseUnit = getVariantBaseUnit(variant);
    const factor = pkg.conversion_factor > 0 ? pkg.conversion_factor : 1;
    const addBaseQty = Math.round(qtyToAdd * factor * 1000) / 1000;
    const usedVariantBase = getCartVariantBaseUsed(cartItems, variant.id);

    if (usedVariantBase + addBaseQty > variant.stock_quantity + 0.0001) {
      const remBase = Math.max(0, Math.round((variant.stock_quantity - usedVariantBase) * 1000) / 1000);
      setScanFeedback({
        status: 'not_found',
        code: variant.barcode,
        message: `পর্যাপ্ত স্টক নেই (${variant.variant_name}): বাকি আছে ${remBase} ${baseUnit}`,
      });
      return false;
    }

    if (batchNo && Array.isArray(variant.batches) && variant.batches.length > 0) {
      const targetBatch = variant.batches.find(
        (b) => b.batch_number.toLowerCase() === batchNo.toLowerCase()
      );
      if (targetBatch) {
        const usedBatchBase = getCartBatchBaseUsed(cartItems, variant.id, batchNo);
        if (usedBatchBase + addBaseQty > targetBatch.stock_quantity + 0.0001) {
          const remBatch = Math.max(
            0,
            Math.round((targetBatch.stock_quantity - usedBatchBase) * 1000) / 1000
          );
          setScanFeedback({
            status: 'not_found',
            code: batchNo,
            message: `Batch ${batchNo}-এ পর্যাপ্ত স্টক নেই (বাকি: ${remBatch} ${baseUnit})`,
          });
          return false;
        }
      }
    }

    const parentProd = activeProducts.find((p) => p.id === variant.product_id);
    const productName = variant.product_name || parentProd?.name || variant.variant_name;

    setCartItems((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.variant_id === variant.id &&
          item.unit === pkg.unit_name &&
          (item.batch_number || '') === (batchNo || '')
      );
      if (idx !== -1) {
        const updated = [...prev];
        const newQty = Math.round((updated[idx].quantity + qtyToAdd) * 1000) / 1000;
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          total_price: Math.max(
            0,
            Math.round(newQty * updated[idx].selling_price * 100) / 100 - updated[idx].item_discount
          ),
        };
        return updated;
      } else {
        const newItem: CartItem = {
          product_id: variant.product_id,
          product_name: productName,
          variant_id: variant.id,
          variant_name: variant.variant_name,
          sku: variant.sku,
          barcode: pkg.barcode || variant.barcode,
          unit: pkg.unit_name,
          base_unit: baseUnit,
          conversion_factor: factor,
          batch_number: batchNo,
          expiry_date: expiryDate,
          purchase_price: pkg.purchase_price,
          selling_price: pkg.selling_price,
          quantity: Math.round(qtyToAdd * 1000) / 1000,
          max_stock: variant.stock_quantity,
          item_discount: 0,
          total_price: Math.round(qtyToAdd * pkg.selling_price * 100) / 100,
        };
        return [...prev, newItem];
      }
    });
    return true;
  };

  // Open Variant / Packaging / Batch Selection Modal
  const openPosSelectModal = (product: Product, initialVariantId: string) => {
    const activeVars = product.variants.filter((v) => v.active);
    const targetVar =
      activeVars.find((v) => v.id === initialVariantId) || activeVars[0] || product.variants[0];
    if (!targetVar) return;
    const pkgOpts = getVariantPackagingOptions(targetVar);
    const defaultPkg = getBasePackagingPriceOption(targetVar) || pkgOpts[0];
    const prefBatch = getPreferredBatchForSale(targetVar);

    setModalVariantId(targetVar.id);
    setModalPkgId(defaultPkg.id);
    setModalBatchNo(prefBatch?.batch_number || '');
    setModalQty('1');
    setPosSelectModal({ product, initialVariantId: targetVar.id });
  };

  const handleCatalogCardClick = (variant: (typeof allVariants)[0]) => {
    const parentProd = activeProducts.find((p) => p.id === variant.product_id);
    const pkgOpts = getVariantPackagingOptions(variant);
    const batches = getVariantBatches(variant);
    const activeVarCount = parentProd ? parentProd.variants.filter((v) => v.active).length : 1;

    if (parentProd && (activeVarCount > 1 || pkgOpts.length > 1 || batches.length > 1)) {
      openPosSelectModal(parentProd, variant.id);
    } else {
      const defaultPkg = pkgOpts[0];
      const prefBatch = getPreferredBatchForSale(variant);
      addConfiguredItemToCart(
        variant,
        defaultPkg,
        prefBatch?.batch_number,
        prefBatch?.expiry_date,
        1
      );
    }
  };

  // Handle Barcode / QR Scan from Camera, Image, or Keyboard Scanner
  const processScannedCode = (rawCode: string, fromCameraModal = false) => {
    const candidates = extractScannedCandidates(rawCode);

    // 1. Check package-specific barcodes first (e.g., Box barcode or Strip barcode)
    for (const v of allVariants) {
      const matchedPkg = findPackagingByBarcode(v, candidates);
      if (matchedPkg) {
        const prefBatch = getPreferredBatchForSale(v);
        const added = addConfiguredItemToCart(
          v,
          matchedPkg,
          prefBatch?.batch_number,
          prefBatch?.expiry_date,
          1
        );
        if (added) {
          setSearchQuery('');
          setScanFeedback({
            status: 'success',
            code: candidates[0],
            message: `কার্টে যোগ হয়েছে: ${v.product_name} (${v.variant_name} · ${matchedPkg.unit_name})`,
          });
        }
        return;
      }
    }

    // 2. Fallback to variant primary barcode / SKU
    const exactMatch = allVariants.find((v) =>
      candidates.some(
        (c) =>
          v.barcode.toLowerCase() === c.toLowerCase() ||
          v.sku.toLowerCase() === c.toLowerCase()
      )
    );

    if (exactMatch) {
      const defaultPkg = getBasePackagingPriceOption(exactMatch);
      const prefBatch = getPreferredBatchForSale(exactMatch);
      const added = addConfiguredItemToCart(
        exactMatch,
        defaultPkg,
        prefBatch?.batch_number,
        prefBatch?.expiry_date,
        1
      );
      if (added) {
        setSearchQuery('');
        setScanFeedback({
          status: 'success',
          code: candidates[0],
          message: `কার্টে যোগ হয়েছে: ${exactMatch.product_name} (${exactMatch.variant_name})`,
        });
      }
    } else {
      const displayCode = candidates[0] || rawCode.trim();
      if (!fromCameraModal) {
        // Keep current search filter if typing manually
      } else {
        setSearchQuery(displayCode);
      }
      setScanFeedback({
        status: 'not_found',
        code: displayCode,
        message: `কোনো প্রোডাক্ট পাওয়া যায়নি (${displayCode}) — নিচের তালিকায় খুঁজুন`,
      });
    }
  };

  // Handle Barcode Auto-Scan (Hardware Scanner / Enter key)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    processScannedCode(searchQuery, false);
  };

  // Update Cart Quantity (with base-unit stock guard)
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const targetItem = cartItems[index];
    if (!targetItem) return;
    const variant = allVariants.find((v) => v.id === targetItem.variant_id);
    if (variant) {
      const factor = targetItem.conversion_factor || 1;
      const neededBase = Math.round(newQty * factor * 1000) / 1000;
      const otherUsedBase = getCartVariantBaseUsed(cartItems, variant.id, index);
      if (otherUsedBase + neededBase > variant.stock_quantity + 0.0001) {
        const rem = Math.max(0, Math.round((variant.stock_quantity - otherUsedBase) * 1000) / 1000);
        setScanFeedback({
          status: 'not_found',
          code: variant.barcode,
          message: `পর্যাপ্ত স্টক নেই (${variant.variant_name}): সর্বোচ্চ বাকি ${rem} ${getVariantBaseUnit(variant)}`,
        });
        return;
      }
      if (targetItem.batch_number && variant.batches?.length) {
        const bObj = variant.batches.find(
          (b) => b.batch_number.toLowerCase() === targetItem.batch_number!.toLowerCase()
        );
        if (bObj) {
          const otherBatchUsed = getCartBatchBaseUsed(
            cartItems,
            variant.id,
            targetItem.batch_number,
            index
          );
          if (otherBatchUsed + neededBase > bObj.stock_quantity + 0.0001) {
            setScanFeedback({
              status: 'not_found',
              code: targetItem.batch_number,
              message: `Batch ${targetItem.batch_number}-এ সর্বোচ্চ ${Math.max(0, bObj.stock_quantity - otherBatchUsed)} ${getVariantBaseUnit(variant)} আছে`,
            });
            return;
          }
        }
      }
    }

    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: Math.round(newQty * 1000) / 1000,
        total_price: Math.max(
          0,
          Math.round(newQty * updated[index].selling_price * 100) / 100 -
            updated[index].item_discount
        ),
      };
      return updated;
    });
  };

  // Switch Packaging Unit inline in Cart
  const updateCartItemPackaging = (index: number, newUnitName: string) => {
    const item = cartItems[index];
    if (!item) return;
    const variant = allVariants.find((v) => v.id === item.variant_id);
    if (!variant) return;
    const pkg = getVariantPackagingOptions(variant).find((o) => o.unit_name === newUnitName);
    if (!pkg) return;

    const neededBase = Math.round(item.quantity * pkg.conversion_factor * 1000) / 1000;
    const otherUsedBase = getCartVariantBaseUsed(cartItems, variant.id, index);
    if (otherUsedBase + neededBase > variant.stock_quantity + 0.0001) {
      setScanFeedback({
        status: 'not_found',
        code: variant.barcode,
        message: `${item.quantity} ${pkg.unit_name} (= ${neededBase} ${getVariantBaseUnit(variant)}) বিক্রির জন্য পর্যাপ্ত স্টক নেই`,
      });
      return;
    }

    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        unit: pkg.unit_name,
        conversion_factor: pkg.conversion_factor,
        purchase_price: pkg.purchase_price,
        selling_price: pkg.selling_price,
        barcode: pkg.barcode || updated[index].barcode,
        total_price: Math.max(
          0,
          Math.round(updated[index].quantity * pkg.selling_price * 100) / 100 -
            updated[index].item_discount
        ),
      };
      return updated;
    });
  };

  // Switch Batch inline in Cart
  const updateCartItemBatch = (index: number, newBatchNo: string) => {
    const item = cartItems[index];
    if (!item) return;
    const variant = allVariants.find((v) => v.id === item.variant_id);
    if (!variant) return;
    const batch = getVariantBatches(variant).find((b) => b.batch_number === newBatchNo);
    if (!batch) return;

    const neededBase = Math.round(item.quantity * (item.conversion_factor || 1) * 1000) / 1000;
    const otherBatchUsed = getCartBatchBaseUsed(cartItems, variant.id, newBatchNo, index);
    if (otherBatchUsed + neededBase > batch.stock_quantity + 0.0001) {
      setScanFeedback({
        status: 'not_found',
        code: newBatchNo,
        message: `Batch ${newBatchNo}-এ পর্যাপ্ত স্টক নেই`,
      });
      return;
    }

    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
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

  const executeCheckoutForCustomer = (targetCustomer: Customer | null) => {
    const paidNum = Math.max(0, parseFloat(paidAmountInput) || 0);
    const dueNum = Math.max(0, Math.round((grandTotal - paidNum) * 100) / 100);

    const saleItems = cartItems.map((ci) => {
      const factor = ci.conversion_factor && ci.conversion_factor > 0 ? ci.conversion_factor : 1;
      const baseQty = Math.round(ci.quantity * factor * 1000) / 1000;
      return {
        id: `sitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        product_id: ci.product_id,
        product_name: ci.product_name,
        variant_id: ci.variant_id,
        variant_name: ci.variant_name,
        sku: ci.sku,
        barcode: ci.barcode,
        quantity: ci.quantity,
        unit: ci.unit,
        base_unit: ci.base_unit || ci.unit,
        conversion_factor: factor,
        base_quantity: baseQty,
        batch_number: ci.batch_number,
        expiry_date: ci.expiry_date,
        unit_purchase_price: ci.purchase_price,
        unit_selling_price: ci.selling_price,
        discount: ci.item_discount,
        total_price: ci.total_price,
      };
    });

    const completedSale: Sale = completeSale({
      customer_id: targetCustomer ? targetCustomer.id : undefined,
      customer_name: targetCustomer ? targetCustomer.name : 'Walk-in Customer',
      customer_mobile: targetCustomer ? targetCustomer.mobile : '',
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

    if (dueNum > 0 && targetCustomer && targetCustomer.mobile) {
      setRecentDueSaleAlert({
        customer: {
          ...targetCustomer,
          total_due_amount: (targetCustomer.total_due_amount || 0) + dueNum,
        },
        invoiceNumber: completedSale.invoice_number,
        dueAmount: dueNum,
      });
    }

    // Reset POS view state
    setCartItems([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setDiscountVal(0);
    setShowPaymentModal(false);
    setShowAddCustomerModal(false);
    setPendingDueCheckout(false);
    setIsCartOpenMobile(false);
    setPaymentNotes('');
  };

  const resetNewCustomerFields = () => {
    setNewCustName('');
    setNewCustMobile('');
    setNewCustAddress('');
    setNewCustEmail('');
    setNewCustPromiseDate('');
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustMobile.trim()) return;
    const created = saveCustomer({
      id: `cust_${Date.now()}`,
      name: newCustName.trim(),
      mobile: newCustMobile.trim(),
      address: newCustAddress.trim(),
      email: newCustEmail.trim() || undefined,
      due_promise_date: newCustPromiseDate.trim() || undefined,
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
    resetNewCustomerFields();

    if (pendingDueCheckout) {
      executeCheckoutForCustomer(created);
    }
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
    setPendingDueCheckout(false);
    setPaidAmountInput('0');
    setShowPaymentModal(true);
  };

  // Submit Final Sale (Auto-opens Register New Customer if Walk-in Customer takes a Due)
  const handleFinalCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const paidNum = Math.max(0, parseFloat(paidAmountInput) || 0);
    const dueNum = Math.max(0, Math.round((grandTotal - paidNum) * 100) / 100);

    if (!selectedCustomer && dueNum > 0) {
      setPendingDueCheckout(true);
      setShowPaymentModal(false);
      setShowAddCustomerModal(true);
      return;
    }

    executeCheckoutForCustomer(selectedCustomer);
  };

  // Filter Customers for Autocomplete
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch)
  );

  // Reusable Cart Body Controller
  const renderCartBody = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full overflow-hidden bg-white">
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
            {filteredCustomers.map((c) => {
              const cStats = getMobilePurchaseStats(c.mobile, sales, c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="w-full p-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{c.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {c.mobile} • কেনা পণ্য: <strong className="text-emerald-700">{cStats.totalProductQuantity} টি</strong> ({cStats.totalOrders} অর্ডার)
                    </div>
                  </div>
                  {c.total_due_amount > 0 && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200 shrink-0">
                      Due: ৳{c.total_due_amount}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredCustomers.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-500">No matching customer found</div>
            )}
          </div>
        )}

        {/* Mobile Purchase History Summary Pill */}
        {selectedCustomer && (() => {
          const sStats = getMobilePurchaseStats(selectedCustomer.mobile, sales, selectedCustomer.id);
          return (
            <div className="mt-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2 text-[11px] text-emerald-800">
              <span className="font-semibold truncate">
                মোবাইল ({selectedCustomer.mobile}) মোট কেনা:
              </span>
              <span className="font-mono font-bold shrink-0">
                {sStats.totalProductQuantity} টি পণ্য ({sStats.uniqueProductsCount} রকমের • {sStats.totalOrders} অর্ডার)
              </span>
            </div>
          );
        })()}

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
        {cartItems.map((item, idx) => {
          const itemVariant = allVariants.find((v) => v.id === item.variant_id);
          const pkgOpts = itemVariant ? getVariantPackagingOptions(itemVariant) : [];
          const batches = itemVariant ? getVariantBatches(itemVariant) : [];
          const factor = item.conversion_factor || 1;
          const baseUnit = item.base_unit || (itemVariant ? getVariantBaseUnit(itemVariant) : item.unit);
          const totalBaseDeduction = Math.round(item.quantity * factor * 1000) / 1000;

          return (
            <div
              key={`${item.variant_id}_${item.unit}_${item.batch_number || 'nobatch'}_${idx}`}
              className="pt-2 first:pt-0 space-y-1.5 hover:bg-slate-50/80 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
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
                    type="button"
                    onClick={() => updateQuantity(idx, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCartIndex(idx);
                      setCustomQtyInput(item.quantity.toString());
                      setShowWeightModal(true);
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 hover:border-emerald-500 text-emerald-700 font-mono font-bold text-xs rounded-lg min-w-[48px] min-h-[32px] text-center cursor-pointer tabular-nums"
                    title="Click to enter custom or decimal quantity"
                  >
                    {item.quantity} {item.unit}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Item Price Total */}
                <div className="text-right min-w-[65px]">
                  <div className="font-bold text-xs text-slate-800 font-mono tabular-nums">
                    {store.currency_symbol}
                    {item.total_price}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(idx)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Packaging Unit & Batch Switchers + Base-Unit Deduction Note */}
              {(pkgOpts.length > 1 || batches.length > 0 || factor !== 1) && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {pkgOpts.length > 1 && (
                    <select
                      value={item.unit}
                      onChange={(e) => updateCartItemPackaging(idx, e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {pkgOpts.map((opt) => (
                        <option key={opt.id} value={opt.unit_name}>
                          {opt.unit_name} ({store.currency_symbol}{opt.selling_price})
                          {opt.conversion_factor > 1 ? ` = ${opt.conversion_factor} ${baseUnit}` : ''}
                        </option>
                      ))}
                    </select>
                  )}

                  {batches.length > 1 ? (
                    <select
                      value={item.batch_number || ''}
                      onChange={(e) => updateCartItemBatch(idx, e.target.value)}
                      className="bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 font-mono font-semibold text-amber-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.batch_number} disabled={b.stock_quantity <= 0}>
                          Batch {b.batch_number} ({b.stock_quantity} {baseUnit}
                          {b.expiry_date ? ` · Exp ${b.expiry_date}` : ''})
                        </option>
                      ))}
                    </select>
                  ) : (
                    item.batch_number && (
                      <span className="font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        Batch {item.batch_number}
                        {item.expiry_date ? ` · Exp ${item.expiry_date}` : ''}
                      </span>
                    )
                  )}

                  {factor !== 1 && (
                    <span className="font-mono text-emerald-700 font-semibold ml-auto tabular-nums">
                      Stock: -{totalBaseDeduction} {baseUnit}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

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
            <span className="font-mono text-emerald-700 text-lg">
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
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer min-h-[44px]"
        >
          <Banknote className="w-4 h-4" />
          <span>PAY ({store.currency_symbol}{grandTotal})</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row xl:h-full min-h-full bg-slate-50 xl:overflow-hidden select-none text-slate-800 relative w-full">
      {/* LEFT / CENTER: PRODUCT & VARIANT CATALOG GRID */}
      <div className="flex-1 flex flex-col p-3 sm:p-4 xl:overflow-hidden xl:border-r border-slate-200 min-w-0">
        {/* Top Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-3">
          {/* Search & Barcode Scan Input */}
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                medEnabled
                  ? 'Scan QR/Barcode or search Product, Generic, Company, Rack...'
                  : 'Scan QR/Barcode or search Product, Brand, Rack...'
              }
              className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder-slate-400 rounded-xl pl-10 pr-24 py-2.5 text-xs focus:outline-none transition-colors min-h-[44px]"
            />
            <button
              type="button"
              onClick={() => {
                setScanFeedback(null);
                setShowScannerModal(true);
              }}
              title="Open QR & Barcode Camera Scanner"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>SCAN</span>
            </button>
          </form>

          {/* Held Bills Counter */}
          {heldCarts.length > 0 && (
            <button
              onClick={() => setShowHeldModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 min-h-[44px] cursor-pointer"
            >
              <PauseCircle className="w-4 h-4 text-amber-600" />
              <span>Held Queue ({heldCarts.length})</span>
            </button>
          )}
        </div>

        {/* QR / Barcode Scan Feedback Toast */}
        {scanFeedback && !showScannerModal && (
          <div
            className={`mb-3 px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs shadow-xs ${
              scanFeedback.status === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {scanFeedback.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-medium truncate">{scanFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setScanFeedback(null)}
              className="p-1 rounded hover:bg-black/5 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Post-Sale Due Quick Alert Bar */}
        {recentDueSaleAlert && (
          <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{recentDueSaleAlert.customer.name}</strong> ({recentDueSaleAlert.invoiceNumber}) — নতুন বাকি:{' '}
                <strong className="font-mono text-rose-700">
                  {store.currency_symbol}{recentDueSaleAlert.dueAmount}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDueAlertTarget({
                    customer: recentDueSaleAlert.customer,
                    invoiceNumber: recentDueSaleAlert.invoiceNumber,
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Send SMS / WhatsApp Alert</span>
              </button>
              <button
                type="button"
                onClick={() => setRecentDueSaleAlert(null)}
                className="p-1 text-amber-700 hover:text-amber-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Type Filter (Super Shop) & Category Filter Tabs */}
        <div className="flex flex-col gap-2 pb-2 mb-2.5 shrink-0">
          {medEnabled && genEnabled && (
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5">
              {(
                [
                  {
                    id: 'all',
                    shortLabel: isBn ? 'সব পণ্য' : 'All Items',
                    fullLabel: isBn ? 'সব পণ্য' : 'All Items',
                  },
                  {
                    id: 'general',
                    shortLabel: isBn ? 'সাধারণ' : 'General',
                    fullLabel: isBn ? 'সাধারণ পণ্য' : 'General Products',
                  },
                  {
                    id: 'medicine',
                    shortLabel: isBn ? 'ওষুধ' : 'Medicine',
                    fullLabel: isBn ? 'ওষুধ' : 'Medicine',
                  },
                ] as const
              ).map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => {
                    setTypeFilter(tf.id);
                    if (
                      (tf.id === 'general' && selectedCategoryId === 'cat_medicine') ||
                      (tf.id === 'medicine' && selectedCategoryId === 'cat_general')
                    ) {
                      setSelectedCategoryId('all');
                    }
                  }}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold text-center leading-tight transition-colors cursor-pointer min-h-[36px] flex items-center justify-center ${
                    typeFilter === tf.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className="sm:hidden">{tf.shortLabel}</span>
                  <span className="hidden sm:inline">{tf.fullLabel}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold leading-tight transition-colors cursor-pointer min-h-[34px] sm:min-h-[36px] ${
                selectedCategoryId === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {isBn ? 'সব ক্যাটাগরি' : 'All Categories'}
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold leading-tight text-left break-words max-w-full transition-colors cursor-pointer min-h-[34px] sm:min-h-[36px] ${
                  selectedCategoryId === cat.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Variant Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 pr-1 pb-28 md:pb-24 xl:pb-2">
          {filteredVariants.map((variant) => {
            const isOutOfStock = variant.stock_quantity <= 0;
            const isLowStock = variant.stock_quantity <= variant.min_stock_level && !isOutOfStock;
            const pkgOpts = getVariantPackagingOptions(variant);
            const baseUnit = getVariantBaseUnit(variant);
            const batchList = getVariantBatches(variant);
            const hasMultiOptions = pkgOpts.length > 1 || batchList.length > 1;

            return (
              <button
                key={variant.id}
                disabled={isOutOfStock}
                onClick={() => handleCatalogCardClick(variant)}
                className={`group relative bg-white border rounded-xl p-3 text-left flex flex-col justify-between transition-all ${
                  isOutOfStock
                    ? 'opacity-50 border-slate-200 cursor-not-allowed bg-slate-50'
                    : 'border-slate-200 hover:border-emerald-500 cursor-pointer'
                }`}
              >
                {/* Product Image or Fallback */}
                {variant.image ? (
                  <div className="w-full h-24 mb-2 rounded-lg overflow-hidden bg-slate-100 relative group-hover:opacity-95 transition-all">
                    <img
                      src={variant.image}
                      alt={variant.product_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span
                      className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-xs tabular-nums ${
                        isOutOfStock
                          ? 'bg-rose-100/90 text-rose-700 border border-rose-200'
                          : isLowStock
                          ? 'bg-amber-100/90 text-amber-800 border border-amber-200'
                          : 'bg-white/90 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isOutOfStock ? 'OUT' : `${variant.stock_quantity} ${baseUnit}`}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-14 mb-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 relative">
                    <Package className="w-6 h-6 opacity-40 text-slate-500" />
                    <span
                      className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm tabular-nums ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isOutOfStock ? 'OUT' : `${variant.stock_quantity} ${baseUnit}`}
                    </span>
                  </div>
                )}

                {/* Variant Header Info */}
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider line-clamp-1">
                      {variant.barcode}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {medEnabled && genEnabled && (
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                            variant.is_medicine
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {variant.is_medicine ? 'Med' : 'Item'}
                        </span>
                      )}
                      {variant.rack_number && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {variant.rack_number}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-tight">
                    {variant.product_name}
                    {medEnabled && variant.strength && (
                      <span className="ml-1 text-[10px] font-mono font-semibold text-emerald-700">
                        {variant.strength}
                      </span>
                    )}
                  </h4>
                  {medEnabled && (variant.medicine_type || variant.generic_name) && (
                    <p className="text-[10px] text-emerald-700 font-medium line-clamp-1 mt-0.5">
                      {variant.medicine_type ? `${variant.medicine_type}` : ''}
                      {variant.medicine_type && variant.generic_name ? ' · ' : ''}
                      {variant.generic_name || ''}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                    {variant.variant_name}
                    {medEnabled && variant.company_name ? ` • ${variant.company_name}` : ''}
                  </p>
                  {hasMultiOptions && (
                    <p className="text-[10px] text-emerald-700 font-semibold line-clamp-1 mt-0.5">
                      {pkgOpts.map((p) => p.unit_name).join(' · ')}
                      {medEnabled && batchList.length > 1 ? ` · ${batchList.length} Batches` : ''}
                    </p>
                  )}
                </div>

                {/* Price & Unit Footer */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 font-mono leading-tight tabular-nums">
                      {store.currency_symbol}
                      {variant.selling_price}
                      <span className="text-[10px] font-normal text-slate-500">/{baseUnit}</span>
                    </div>
                    {variant.mrp !== undefined && variant.mrp > variant.selling_price && (
                      <div className="text-[10px] font-mono text-slate-400 line-through leading-tight tabular-nums">
                        MRP {store.currency_symbol}{variant.mrp}
                      </div>
                    )}
                  </div>
                  <div className="w-7 h-7 rounded-md bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-600 transition-all shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            );
          })}

          {filteredVariants.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Search className="w-10 h-10 mb-2 text-slate-400" />
              <p className="text-sm font-semibold">
                {!medEnabled && !genEnabled
                  ? 'All product & medicine modules are turned OFF'
                  : 'No products found'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {!medEnabled && !genEnabled
                  ? 'Enable Medicine or General Product module in Store Settings to sell items.'
                  : 'Try another search term or filter category'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP RIGHT PANEL: CART & CHECKOUT CONTROLLER (hidden on mobile/tablet) */}
      <div className="hidden xl:flex xl:w-[420px] 2xl:w-[460px] bg-white border-l border-slate-200 flex-col h-full shrink-0">
        {renderCartBody(false)}
      </div>

      {/* MOBILE / TABLET FLOATING DOCKED CART BUTTON (sits cleanly above MobileBottomNav) */}
      <div className="fixed bottom-20 md:bottom-5 right-3 sm:right-5 z-30 xl:hidden">
        <button
          onClick={() => setIsCartOpenMobile(true)}
          className="flex items-center gap-3 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl border border-emerald-500 min-h-[48px] cursor-pointer"
          title="Open Cart"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                {cartItems.reduce((acc, i) => acc + (i.quantity >= 1 ? Math.floor(i.quantity) : 1), 0)}
              </span>
            )}
          </div>
          <div className="text-left font-sans">
            <div className="text-[10px] uppercase font-semibold tracking-wider opacity-90 leading-tight">
              {cartItems.length === 0 ? 'Cart Empty' : `${cartItems.length} Item(s)`}
            </div>
            <div className="text-sm font-bold font-mono leading-tight">
              {store.currency_symbol}{grandTotal}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 ml-0.5 opacity-80" />
        </button>
      </div>

      {/* MOBILE / TABLET SLIDE-OVER CART DRAWER */}
      {isCartOpenMobile && (
        <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpenMobile(false)}
          />
          {/* Slide Drawer Panel */}
          <div className="relative w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Single Close Button Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">Cart & Checkout ({cartItems.length} items)</span>
              </div>
              <button
                onClick={() => setIsCartOpenMobile(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-white/20"
                title="Close Cart"
              >
                <X className="w-4 h-4" />
                <span>Close Cart</span>
              </button>
            </div>
            {/* Cart Body */}
            <div className="flex-1 overflow-hidden">
              {renderCartBody(true)}
            </div>
          </div>
        </div>
      )}

      {/* WEIGHT & DECIMAL QUANTITY MODAL */}
      {showWeightModal && selectedCartIndex !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
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

      {/* QUICK ADD CUSTOMER MODAL (also auto-opens on Walk-in Due Checkout) */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">Register New Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  if (pendingDueCheckout) {
                    setPendingDueCheckout(false);
                    setShowPaymentModal(true);
                  }
                }}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {pendingDueCheckout && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    বাকি বিক্রয় (Due: {store.currency_symbol}
                    {Math.max(0, grandTotal - (parseFloat(paidAmountInput) || 0)).toFixed(2)})
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Walk-in Customer বাকি নিচ্ছেন। বাকি হিসাব ও SMS/WhatsApp রিমাইন্ডার পাঠাতে কাস্টমারের নাম ও মোবাইল নম্বর সেভ করুন।
                </p>
              </div>
            )}

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Rahim Ahmed"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
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
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              {(() => {
                const mobileClean = newCustMobile.trim();
                const existingMatch =
                  mobileClean.length >= 6
                    ? customers.find((c) => c.mobile.trim() === mobileClean)
                    : undefined;
                if (!existingMatch) return null;
                return (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">
                        Existing: {existingMatch.name}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Previous Due: {store.currency_symbol}{existingMatch.total_due_amount}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(existingMatch);
                        setCustomerSearch(`${existingMatch.name} (${existingMatch.mobile})`);
                        setShowAddCustomerModal(false);
                        resetNewCustomerFields();
                        if (pendingDueCheckout) {
                          executeCheckoutForCustomer(existingMatch);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      {pendingDueCheckout ? 'Select & Complete' : 'Select Existing'}
                    </button>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address (Optional)</label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="e.g. Mirpur, Dhaka"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>Due Pay Date (Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={newCustPromiseDate}
                    onChange={(e) => setNewCustPromiseDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    if (pendingDueCheckout) {
                      setPendingDueCheckout(false);
                      setShowPaymentModal(true);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {pendingDueCheckout ? 'Back to Payment' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
                >
                  {pendingDueCheckout ? 'Save & Complete Due Sale' : 'Save & Select Customer'}
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full text-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
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
                <button
                  type="button"
                  onClick={() => setPaidAmountInput(grandTotal.toString())}
                  title="Grand Total এ ক্লিক করলে Amount Received এ টাকা যোগ হবে"
                  className="p-3 bg-blue-50/70 hover:bg-blue-100/80 active:scale-[0.99] rounded-xl border border-blue-200 hover:border-blue-400 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-blue-700 uppercase font-bold">Grand Total</span>
                    <span className="text-[9px] font-semibold text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      Tap to Fill
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">
                    {store.currency_symbol}
                    {grandTotal}
                  </div>
                </button>

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
                  <div className="flex justify-between items-center text-xs text-slate-700 mb-1 font-medium">
                    <span>Amount Received:</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaidAmountInput('0')}
                        className="text-slate-500 hover:text-slate-800 underline text-[11px] cursor-pointer"
                      >
                        Clear (0)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidAmountInput(grandTotal.toString())}
                        className="text-blue-600 underline hover:text-blue-800 text-[11px] font-semibold cursor-pointer"
                      >
                        Exact Total ({store.currency_symbol}
                        {grandTotal})
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={paidAmountInput}
                    onFocus={(e) => {
                      if (paidAmountInput === '0') e.target.select();
                    }}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-center text-2xl font-mono text-blue-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Due Calculation Display + Walk-in Registration Requirement */}
                {(parseFloat(paidAmountInput) || 0) < grandTotal && (
                  <div className="space-y-2">
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between font-bold">
                      <span>CUSTOMER DUE AMOUNT:</span>
                      <span className="font-mono text-base text-rose-700">
                        {store.currency_symbol}
                        {Math.max(0, grandTotal - (parseFloat(paidAmountInput) || 0)).toFixed(2)}
                      </span>
                    </div>

                    {!selectedCustomer && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Walk-in Customer বাকি নিচ্ছেন!</strong> বাকি সংরক্ষণের জন্য নতুন কাস্টমার রেজিস্টার করুন (অথবা নিচে কনফার্ম চাপলে রেজিস্ট্রেশন ফর্ম ওপেন হবে)।
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingDueCheckout(true);
                            setShowPaymentModal(false);
                            setShowAddCustomerModal(true);
                          }}
                          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Register New Customer Now</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-colors cursor-pointer"
                >
                  {!selectedCustomer && (parseFloat(paidAmountInput) || 0) < grandTotal
                    ? 'Register Customer & Confirm'
                    : 'Confirm & Print Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST-SALE DUE ALERT MODAL */}
      {dueAlertTarget && (
        <DueAlertModal
          customer={dueAlertTarget.customer}
          invoiceNumber={dueAlertTarget.invoiceNumber}
          onClose={() => setDueAlertTarget(null)}
        />
      )}

      {/* QR & BARCODE CAMERA SCANNER MODAL */}
      <QrBarcodeScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScan={(decodedText) => processScannedCode(decodedText, true)}
        title="POS QR & Barcode Scanner"
        subtitle="পণ্যের QR Code বা Barcode স্ক্যান করলে অটোমেটিক কার্টে যোগ হবে"
        allowContinuous={true}
        feedback={scanFeedback}
      />

      {/* VARIANT, PACKAGING & BATCH SELECTION MODAL */}
      {posSelectModal && (() => {
        const prod = posSelectModal.product;
        const activeVars = prod.variants.filter((v) => v.active);
        const selVar =
          activeVars.find((v) => v.id === modalVariantId) || activeVars[0] || prod.variants[0];
        if (!selVar) return null;

        const baseUnit = getVariantBaseUnit(selVar);
        const pkgOpts = getVariantPackagingOptions(selVar);
        const selPkg = pkgOpts.find((o) => o.id === modalPkgId) || pkgOpts[0];
        const batches = getVariantBatches(selVar);
        const selBatch = batches.find((b) => b.batch_number === modalBatchNo) || batches[0] || null;
        const parsedQty = Math.max(0.001, parseFloat(modalQty) || 1);
        const factor = selPkg ? selPkg.conversion_factor : 1;
        const baseDeduction = Math.round(parsedQty * factor * 1000) / 1000;
        const availBase = selBatch ? selBatch.stock_quantity : selVar.stock_quantity;
        const lineTotal = selPkg ? Math.round(parsedQty * selPkg.selling_price * 100) / 100 : 0;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 text-slate-800">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{prod.name}</h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {medEnabled && prod.generic_name ? `${prod.generic_name} · ` : ''}
                      {(medEnabled ? prod.company_name : undefined) || prod.brand_name || 'Select variant & packaging'}
                      {prod.rack_number ? ` · Rack ${prod.rack_number}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPosSelectModal(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Variant Selection (e.g., Napa 500 vs Napa 665 or 100ml vs 200ml) */}
              {activeVars.length > 1 && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    1. Select Variant
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeVars.map((v) => {
                      const isSel = v.id === selVar.id;
                      const vBase = getVariantBaseUnit(v);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={v.stock_quantity <= 0}
                          onClick={() => {
                            setModalVariantId(v.id);
                            const nextPkgs = getVariantPackagingOptions(v);
                            const nextDef = getBasePackagingPriceOption(v) || nextPkgs[0];
                            const nextBatch = getPreferredBatchForSale(v);
                            setModalPkgId(nextDef.id);
                            setModalBatchNo(nextBatch?.batch_number || '');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSel
                              ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {v.variant_name}
                              {medEnabled && v.strength ? ` (${v.strength})` : ''}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 shrink-0 tabular-nums">
                              {v.stock_quantity} {vBase}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                            SKU: {v.sku} · {store.currency_symbol}{v.selling_price}/{vBase}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Packaging Unit Selection (Box / Strip / Tablet or Carton / Box / Packet) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {activeVars.length > 1 ? '2. Select Packaging Unit' : '1. Select Packaging Unit'}
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Stock: {formatStockBreakdown(availBase, selVar)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {pkgOpts.map((opt) => {
                    const isSel = opt.id === selPkg?.id;
                    const maxUnitsInThisTier = Math.floor((availBase / opt.conversion_factor) * 100) / 100;
                    const insufficientPack = availBase < opt.conversion_factor && availBase <= 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={insufficientPack}
                        onClick={() => setModalPkgId(opt.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 ${
                          isSel
                            ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900">{opt.unit_name}</span>
                          {opt.conversion_factor > 1 && (
                            <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                              ×{opt.conversion_factor} {baseUnit}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-mono font-bold text-emerald-700 mt-1 tabular-nums">
                          {store.currency_symbol}{opt.selling_price}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                          MRP {store.currency_symbol}{opt.mrp} · Avail: {maxUnitsInThisTier}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Batch & Expiry Selection (if tracked) */}
              {batches.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Select Batch (FEFO Earliest Expiry First)
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {batches.map((b) => {
                      const isSel = selBatch?.batch_number === b.batch_number;
                      const daysLeft = getDaysUntilExpiry(b.expiry_date);
                      const isExpired = daysLeft !== null && daysLeft < 0;
                      const isNearExpiry = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          disabled={b.stock_quantity <= 0}
                          onClick={() => setModalBatchNo(b.batch_number)}
                          className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSel
                              ? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-400'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-slate-800">
                              {b.batch_number}
                            </span>
                            {b.expiry_date && (
                              <span
                                className={`text-[11px] font-mono ${
                                  isExpired
                                    ? 'text-rose-700 font-bold'
                                    : isNearExpiry
                                    ? 'text-amber-700 font-semibold'
                                    : 'text-slate-500'
                                }`}
                              >
                                Exp: {b.expiry_date}
                                {isExpired ? ' (EXPIRED)' : isNearExpiry ? ` (${daysLeft}d)` : ''}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-slate-700 shrink-0 tabular-nums">
                            {b.stock_quantity} {baseUnit}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Quantity & Base-Unit Stock Deduction Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700">
                    Quantity ({selPkg?.unit_name})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setModalQty(String(Math.max(1, Math.round((parsedQty - 1) * 1000) / 1000)))
                      }
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={modalQty}
                      onChange={(e) => setModalQty(e.target.value)}
                      className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setModalQty(String(Math.round((parsedQty + 1) * 1000) / 1000))
                      }
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                  <span className="text-slate-600">
                    Stock deduction:{' '}
                    <strong className="font-mono text-emerald-700 tabular-nums">
                      -{baseDeduction} {baseUnit}
                    </strong>
                    {baseDeduction > availBase && (
                      <span className="text-rose-600 font-bold ml-1.5">(Exceeds stock!)</span>
                    )}
                  </span>
                  <span className="font-mono font-extrabold text-sm text-slate-900 tabular-nums">
                    Total: {store.currency_symbol}{lineTotal}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPosSelectModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selPkg || baseDeduction > availBase + 0.0001}
                  onClick={() => {
                    if (!selPkg) return;
                    const variantWithProdName = { ...selVar, product_name: prod.name };
                    const ok = addConfiguredItemToCart(
                      variantWithProdName,
                      selPkg,
                      selBatch?.batch_number,
                      selBatch?.expiry_date,
                      parsedQty
                    );
                    if (ok) setPosSelectModal(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Cart ({store.currency_symbol}{lineTotal})</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
