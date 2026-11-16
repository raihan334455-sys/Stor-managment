import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boxes,
  Search,
  Sliders,
  Calendar,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Flame,
  X,
  UserMinus,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { ProductVariant, StockAdjustmentType } from '../../types';
import {
  isGeneralProductModuleEnabled,
  isMedicineModuleEnabled,
  isMedicineProduct,
  isProductEnabled,
} from '../../utils/modules';

export type InventoryTabType =
  | 'overview'
  | 'personal_use'
  | 'adjustments'
  | 'history'
  | 'transfers';

interface StockManagementProps {
  initialTab?: InventoryTabType;
  initialAdjType?: StockAdjustmentType;
}

const ADJUSTMENT_TYPES: {
  id: StockAdjustmentType;
  labelEn: string;
  labelBn: string;
  badgeColor: string;
}[] = [
  { id: 'owner_personal_use', labelEn: 'Owner Personal Use', labelBn: 'মালিকের ব্যক্তিগত ব্যবহার', badgeColor: 'bg-teal-50 text-teal-800 border-teal-200' },
  { id: 'staff_personal_use', labelEn: 'Staff Personal Use', labelBn: 'স্টাফের ব্যক্তিগত ব্যবহার', badgeColor: 'bg-sky-50 text-sky-800 border-sky-200' },
  { id: 'damaged_stock', labelEn: 'Damaged Stock', labelBn: 'নষ্ট / ড্যামেজ স্টক', badgeColor: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'expired_stock', labelEn: 'Expired Stock', labelBn: 'মেয়াদোত্তীর্ণ স্টক', badgeColor: 'bg-orange-50 text-orange-800 border-orange-200' },
  { id: 'wastage', labelEn: 'Wastage', labelBn: 'অপচয় / ওয়েস্টেজ', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'free_sample', labelEn: 'Free Sample', labelBn: 'ফ্রি স্যাম্পল', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'promotional_use', labelEn: 'Promotional Use', labelBn: 'প্রমোশনাল ব্যবহার', badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { id: 'stock_correction', labelEn: 'Stock Correction', labelBn: 'স্টক সংশোধন', badgeColor: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'missing_lost', labelEn: 'Missing / Lost Stock', labelBn: 'হারানো / ঘাটতি স্টক', badgeColor: 'bg-rose-100 text-rose-900 border-rose-300' },
];

export const StockManagement: React.FC<StockManagementProps> = ({
  initialTab = 'overview',
  initialAdjType = 'stock_correction',
}) => {
  const {
    products,
    stockTransactions,
    stockAdjustments,
    stockTransfers,
    store,
    activeUser,
    adjustStock,
    recordStockIn,
    recordStockOut,
    recordDamageStock,
    recordStockTransfer,
    recordStockAdjustment,
  } = useApp();

  const isBn = store.language === 'bn';
  const medEnabled = isMedicineModuleEnabled(store);
  const genEnabled = isGeneralProductModuleEnabled(store);
  const isSuperShop = medEnabled && genEnabled;

  const [subTab, setSubTab] = useState<InventoryTabType>(initialTab);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out' | 'expiring'>('all');
  const [moduleFilter, setModuleFilter] = useState<'all' | 'medicine' | 'general'>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');

  useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isSuperShop) {
      setModuleFilter('all');
    }
  }, [isSuperShop]);

  useEffect(() => {
    if (!medEnabled && filterType === 'expiring') {
      setFilterType('all');
    }
  }, [medEnabled, filterType]);

  // Quick Physical Adjust Modal (existing)
  const [showAdjModal, setShowAdjModal] = useState<boolean>(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [newStockVal, setNewStockVal] = useState<string>('0');
  const [adjReason, setAdjReason] = useState<string>('Physical Count Correction');

  // Stock Movement Modal (Stock In / Stock Out / Damage)
  const [movementModal, setMovementModal] = useState<'stock_in' | 'stock_out' | 'damage' | null>(null);
  const [mvVariantId, setMvVariantId] = useState<string>('');
  const [mvQty, setMvQty] = useState<string>('1');
  const [mvReason, setMvReason] = useState<string>('');
  const [mvRef, setMvRef] = useState<string>('');

  // Stock Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [trVariantId, setTrVariantId] = useState<string>('');
  const [trQty, setTrQty] = useState<string>('1');
  const [trFrom, setTrFrom] = useState<string>('Main Store / Warehouse');
  const [trTo, setTrTo] = useState<string>('Display Shelf / Rack');
  const [trNotes, setTrNotes] = useState<string>('');

  // Personal Use & 9-Type Stock Adjustment Form States
  const [puType, setPuType] = useState<'owner_personal_use' | 'staff_personal_use'>('owner_personal_use');
  const [puProdQuery, setPuProdQuery] = useState<string>('');
  const [puVariantId, setPuVariantId] = useState<string>('');
  const [puQty, setPuQty] = useState<string>('1');
  const [puDate, setPuDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [puReason, setPuReason] = useState<string>('Home / Family Consumption');
  const [puTakenBy, setPuTakenBy] = useState<string>(store.seller_name || activeUser.name);
  const [puNote, setPuNote] = useState<string>('');
  const [puConfirmStep, setPuConfirmStep] = useState<boolean>(false);
  const [puViewMode, setPuViewMode] = useState<'history' | 'by_product' | 'monthly'>('history');
  const [puDateFrom, setPuDateFrom] = useState<string>('');
  const [puDateTo, setPuDateTo] = useState<string>('');

  const [adjFormType, setAdjFormType] = useState<StockAdjustmentType>(initialAdjType);
  const [adjDirection, setAdjDirection] = useState<'deduct' | 'add'>('deduct');
  const [adjVariantId, setAdjVariantId] = useState<string>('');
  const [adjFormQty, setAdjFormQty] = useState<string>('1');
  const [adjFormDate, setAdjFormDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [adjFormReason, setAdjFormReason] = useState<string>('');
  const [adjFormTakenBy, setAdjFormTakenBy] = useState<string>(activeUser.name);
  const [adjFormNote, setAdjFormNote] = useState<string>('');
  const [adjConfirmStep, setAdjConfirmStep] = useState<boolean>(false);
  const [adjFilterType, setAdjFilterType] = useState<'all' | StockAdjustmentType>('all');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setAdjFormType(initialAdjType);
    if (initialAdjType !== 'stock_correction') {
      setAdjDirection('deduct');
    }
  }, [initialAdjType]);

  const enabledProducts = useMemo(
    () => products.filter((p) => !p.archived && isProductEnabled(p, store)),
    [products, store]
  );

  const disabledProductIds = useMemo(
    () => new Set(products.filter((p) => !isProductEnabled(p, store)).map((p) => p.id)),
    [products, store]
  );

  const allVariants = useMemo(
    () =>
      enabledProducts.flatMap((p) =>
        p.variants.map((v) => ({
          ...v,
          product_id: p.id,
          product_name: p.name,
          is_medicine: isMedicineProduct(p),
          code: p.code,
          generic_name: p.generic_name,
          company_name: p.company_name,
          strength: v.strength || p.strength,
          rack_number: p.rack_number,
          product_active: p.active !== false,
        }))
      ),
    [enabledProducts]
  );

  useEffect(() => {
    if (allVariants.length > 0) {
      if (!puVariantId || !allVariants.some((v) => v.id === puVariantId)) {
        setPuVariantId(allVariants[0].id);
      }
      if (!adjVariantId || !allVariants.some((v) => v.id === adjVariantId)) {
        setAdjVariantId(allVariants[0].id);
      }
    }
  }, [allVariants, puVariantId, adjVariantId]);

  const visibleStockTransactions = stockTransactions.filter(
    (tx) => !disabledProductIds.has(tx.product_id)
  );
  const visibleStockTransfers = stockTransfers.filter(
    (tr) => !disabledProductIds.has(tr.product_id)
  );
  const visibleStockAdjustments = stockAdjustments.filter(
    (adj) => !disabledProductIds.has(adj.product_id)
  );

  const lowStockCount = allVariants.filter(
    (v) => v.stock_quantity > 0 && v.stock_quantity <= v.min_stock_level
  ).length;
  const outOfStockCount = allVariants.filter((v) => v.stock_quantity <= 0).length;

  const filteredVariants = allVariants.filter((v) => {
    if (isSuperShop && moduleFilter === 'medicine' && !v.is_medicine) return false;
    if (isSuperShop && moduleFilter === 'general' && v.is_medicine) return false;

    const isOut = v.stock_quantity <= 0;
    const isLow = v.stock_quantity <= v.min_stock_level;
    const soonThreshold = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const isExpiring = Boolean(v.expiry_date && new Date(v.expiry_date) <= soonThreshold);

    if (filterType === 'low' && !isLow) return false;
    if (filterType === 'out' && !isOut) return false;
    if (medEnabled && filterType === 'expiring' && !isExpiring) return false;

    const q = search.toLowerCase();
    return (
      !q ||
      v.product_name.toLowerCase().includes(q) ||
      v.variant_name.toLowerCase().includes(q) ||
      v.barcode.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q) ||
      (medEnabled && (v.generic_name || '').toLowerCase().includes(q)) ||
      (medEnabled && (v.company_name || '').toLowerCase().includes(q)) ||
      (medEnabled && (v.strength || '').toLowerCase().includes(q)) ||
      (v.rack_number || '').toLowerCase().includes(q) ||
      (medEnabled && (v.batch_number || '').toLowerCase().includes(q))
    );
  });

  const filteredHistory = visibleStockTransactions.filter((tx) => {
    if (historyTypeFilter !== 'all' && tx.transaction_type !== historyTypeFilter) return false;
    const q = search.toLowerCase();
    return (
      !q ||
      tx.product_name.toLowerCase().includes(q) ||
      tx.variant_name.toLowerCase().includes(q) ||
      (tx.reference_no || '').toLowerCase().includes(q) ||
      (tx.reason || '').toLowerCase().includes(q)
    );
  });

  // Personal Use Data & Calculations
  const personalUseRecords = useMemo(
    () =>
      visibleStockAdjustments.filter(
        (r) =>
          (r.adjustment_type === 'owner_personal_use' ||
            r.adjustment_type === 'staff_personal_use') &&
          (!isSuperShop ||
            moduleFilter === 'all' ||
            (moduleFilter === 'medicine' ? r.is_medicine : !r.is_medicine))
      ),
    [visibleStockAdjustments, isSuperShop, moduleFilter]
  );

  const filteredPersonalUse = useMemo(() => {
    const q = search.toLowerCase();
    return personalUseRecords.filter((r) => {
      if (puDateFrom && r.date < puDateFrom) return false;
      if (puDateTo && r.date > puDateTo) return false;
      return (
        !q ||
        r.product_name.toLowerCase().includes(q) ||
        r.variant_name.toLowerCase().includes(q) ||
        r.reference_no.toLowerCase().includes(q) ||
        r.taken_by.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    });
  }, [personalUseRecords, search, puDateFrom, puDateTo]);

  const personalUseByProduct = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        product_name: string;
        variant_name: string;
        unit: string;
        count: number;
        totalQty: number;
        totalCost: number;
        lastDate: string;
      }
    >();
    filteredPersonalUse.forEach((r) => {
      const k = r.variant_id;
      const cur = map.get(k);
      if (cur) {
        cur.count += 1;
        cur.totalQty = Math.round((cur.totalQty + r.quantity) * 1000) / 1000;
        cur.totalCost = Math.round((cur.totalCost + r.total_purchase_value) * 100) / 100;
        if (r.date > cur.lastDate) cur.lastDate = r.date;
      } else {
        map.set(k, {
          key: k,
          product_name: r.product_name,
          variant_name: r.variant_name,
          unit: r.unit,
          count: 1,
          totalQty: r.quantity,
          totalCost: r.total_purchase_value,
          lastDate: r.date,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredPersonalUse]);

  const personalUseMonthly = useMemo(() => {
    const map = new Map<
      string,
      { month: string; entries: number; totalQty: number; totalCost: number }
    >();
    filteredPersonalUse.forEach((r) => {
      const month = r.date.slice(0, 7);
      const cur = map.get(month);
      if (cur) {
        cur.entries += 1;
        cur.totalQty = Math.round((cur.totalQty + r.quantity) * 1000) / 1000;
        cur.totalCost = Math.round((cur.totalCost + r.total_purchase_value) * 100) / 100;
      } else {
        map.set(month, {
          month,
          entries: 1,
          totalQty: r.quantity,
          totalCost: r.total_purchase_value,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredPersonalUse]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);
  const todayPersonalUseCost = personalUseRecords
    .filter((r) => r.date === todayStr)
    .reduce((sum, r) => sum + r.total_purchase_value, 0);
  const monthPersonalUseCost = personalUseRecords
    .filter((r) => r.date.startsWith(currentMonthStr))
    .reduce((sum, r) => sum + r.total_purchase_value, 0);
  const totalPersonalUseCost = personalUseRecords.reduce(
    (sum, r) => sum + r.total_purchase_value,
    0
  );
  const totalPersonalUseQty = personalUseRecords.reduce((sum, r) => sum + r.quantity, 0);

  const selectedPuVariant = allVariants.find((v) => v.id === puVariantId) || null;
  const puNumericQty = Math.max(0, parseFloat(puQty) || 0);
  const puEstimatedCost = selectedPuVariant
    ? Math.round(puNumericQty * selectedPuVariant.purchase_price * 100) / 100
    : 0;

  const puSelectableVariants = useMemo(() => {
    const q = puProdQuery.toLowerCase();
    return allVariants.filter(
      (v) =>
        !q ||
        v.product_name.toLowerCase().includes(q) ||
        v.variant_name.toLowerCase().includes(q) ||
        v.barcode.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q)
    );
  }, [allVariants, puProdQuery]);

  // All 9-Type Stock Adjustments filtered
  const filteredAdjustments = useMemo(() => {
    const q = search.toLowerCase();
    return visibleStockAdjustments.filter((r) => {
      if (isSuperShop && moduleFilter === 'medicine' && !r.is_medicine) return false;
      if (isSuperShop && moduleFilter === 'general' && r.is_medicine) return false;
      if (adjFilterType !== 'all' && r.adjustment_type !== adjFilterType) return false;
      if (puDateFrom && r.date < puDateFrom) return false;
      if (puDateTo && r.date > puDateTo) return false;
      return (
        !q ||
        r.product_name.toLowerCase().includes(q) ||
        r.variant_name.toLowerCase().includes(q) ||
        r.reference_no.toLowerCase().includes(q) ||
        r.taken_by.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    });
  }, [visibleStockAdjustments, isSuperShop, moduleFilter, adjFilterType, search, puDateFrom, puDateTo]);

  const selectedAdjVariant = allVariants.find((v) => v.id === adjVariantId) || null;
  const adjNumericQty = Math.max(0, parseFloat(adjFormQty) || 0);
  const adjEstimatedCost = selectedAdjVariant
    ? Math.round(adjNumericQty * selectedAdjVariant.purchase_price * 100) / 100
    : 0;

  // Handlers
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  const handleSubmitPersonalUse = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!selectedPuVariant) {
      showFeedback('error', 'Please select a valid product or medicine.');
      return;
    }
    if (puNumericQty <= 0) {
      showFeedback('error', 'Quantity must be greater than 0.');
      return;
    }
    if (puNumericQty > selectedPuVariant.stock_quantity) {
      showFeedback(
        'error',
        `Insufficient stock. Only ${selectedPuVariant.stock_quantity} ${selectedPuVariant.unit} available.`
      );
      return;
    }
    if (!puConfirmStep) {
      setPuConfirmStep(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = recordStockAdjustment({
        variant_id: selectedPuVariant.id,
        adjustment_type: puType,
        direction: 'deduct',
        quantity: puNumericQty,
        date: puDate,
        reason: puReason || 'Owner Personal Use',
        note: puNote,
        taken_by: puTakenBy,
      });
      if (!res.success) {
        showFeedback('error', res.message || 'Could not record personal use entry.');
      } else {
        showFeedback(
          'success',
          `${res.record?.reference_no} saved: ${puNumericQty} ${selectedPuVariant.unit} of ${selectedPuVariant.product_name} deducted (Cost Value: ${store.currency_symbol}${res.record?.total_purchase_value}). Not counted as sales revenue.`
        );
        setPuQty('1');
        setPuNote('');
        setPuConfirmStep(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFullAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!selectedAdjVariant) {
      showFeedback('error', 'Please select a valid item.');
      return;
    }
    if (adjNumericQty <= 0) {
      showFeedback('error', 'Quantity must be greater than 0.');
      return;
    }
    const effectiveDirection: 'deduct' | 'add' =
      adjFormType === 'stock_correction' ? adjDirection : 'deduct';
    if (effectiveDirection === 'deduct' && adjNumericQty > selectedAdjVariant.stock_quantity) {
      showFeedback(
        'error',
        `Insufficient stock (${selectedAdjVariant.stock_quantity} available).`
      );
      return;
    }
    if (!adjConfirmStep) {
      setAdjConfirmStep(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = recordStockAdjustment({
        variant_id: selectedAdjVariant.id,
        adjustment_type: adjFormType,
        direction: effectiveDirection,
        quantity: adjNumericQty,
        date: adjFormDate,
        reason:
          adjFormReason.trim() ||
          ADJUSTMENT_TYPES.find((t) => t.id === adjFormType)?.labelEn ||
          'Stock Adjustment',
        note: adjFormNote,
        taken_by: adjFormTakenBy,
      });
      if (!res.success) {
        showFeedback('error', res.message || 'Could not apply adjustment.');
      } else {
        showFeedback(
          'success',
          `${res.record?.reference_no} applied (${effectiveDirection === 'add' ? '+' : '-'}${adjNumericQty} ${selectedAdjVariant.unit}). Cost impact: ${store.currency_symbol}${res.record?.total_purchase_value}.`
        );
        setAdjFormQty('1');
        setAdjFormReason('');
        setAdjFormNote('');
        setAdjConfirmStep(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportAdjustmentsCsv = (rows: typeof visibleStockAdjustments, filenamePrefix: string) => {
    const header = [
      'Reference',
      'Date',
      'Time',
      'Type',
      'Direction',
      'Product',
      'Variant',
      'Quantity',
      'Unit',
      'Purchase Price',
      'Total Cost Value',
      'Taken By',
      'Reason',
      'Note',
    ];
    const csvRows = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.reference_no,
          r.date,
          r.time,
          r.adjustment_type,
          r.direction,
          `"${(r.product_name || '').replace(/"/g, '""')}"`,
          `"${(r.variant_name || '').replace(/"/g, '""')}"`,
          r.quantity,
          r.unit,
          r.purchase_price,
          r.total_purchase_value,
          `"${(r.taken_by || '').replace(/"/g, '""')}"`,
          `"${(r.reason || '').replace(/"/g, '""')}"`,
          `"${(r.note || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenAdjust = (v: ProductVariant) => {
    setSelectedVariant(v);
    setNewStockVal(v.stock_quantity.toString());
    setAdjReason('Physical Count Correction');
    setShowAdjModal(true);
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;
    const val = parseFloat(newStockVal) || 0;
    adjustStock(selectedVariant.id, val, adjReason);
    setShowAdjModal(false);
  };

  const openMovement = (type: 'stock_in' | 'stock_out' | 'damage') => {
    if (allVariants.length > 0 && !mvVariantId) {
      setMvVariantId(allVariants[0].id);
    }
    setMvQty('1');
    setMvRef('');
    setMvReason(
      type === 'stock_in'
        ? 'Direct Stock Inward / Restock'
        : type === 'stock_out'
        ? 'Internal Issue / Dispatch'
        : 'Damaged / Broken / Expired Stock'
    );
    setMovementModal(type);
  };

  const handleConfirmMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModal || !mvVariantId) return;
    const qty = parseFloat(mvQty) || 0;
    if (qty <= 0) return;
    if (movementModal === 'stock_in') {
      recordStockIn(mvVariantId, qty, mvReason, mvRef.trim() || undefined);
    } else if (movementModal === 'stock_out') {
      recordStockOut(mvVariantId, qty, mvReason, mvRef.trim() || undefined);
    } else {
      recordDamageStock(mvVariantId, qty, mvReason);
    }
    setMovementModal(null);
  };

  const handleOpenTransfer = () => {
    if (allVariants.length > 0 && !trVariantId) {
      setTrVariantId(allVariants[0].id);
    }
    setTrQty('1');
    setTrNotes('');
    setShowTransferModal(true);
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(trQty) || 0;
    if (!trVariantId || qty <= 0) return;
    recordStockTransfer({
      variant_id: trVariantId,
      quantity: qty,
      from_location: trFrom.trim() || 'Main Store',
      to_location: trTo.trim() || 'Display Shelf',
      notes: trNotes.trim() || undefined,
    });
    setShowTransferModal(false);
    setSubTab('transfers');
  };

  const getAdjTypeMeta = (id: StockAdjustmentType) =>
    ADJUSTMENT_TYPES.find((t) => t.id === id) || ADJUSTMENT_TYPES[0];

  return (
    <div className="p-3 sm:p-5 lg:p-6 bg-slate-50 min-h-full text-slate-800 space-y-5">
      {/* Page Title & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-slate-900">
            <Boxes className="w-5 h-5 text-emerald-600" />
            <span>
              {isBn
                ? 'ইনভেন্টরি, ব্যক্তিগত ব্যবহার ও স্টক সমন্বয়'
                : 'Inventory, Personal Use & Stock Management'}
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            {isBn
              ? 'লাইভ স্টক, মালিকের ব্যক্তিগত ব্যবহার (বিক্রি ছাড়া), নষ্ট/মেয়াদোত্তীর্ণ ও স্টক হিস্ট্রি'
              : 'Live stock, Owner Personal Use, Damaged/Expired write-offs, Stock Transfer & Movement History.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => openMovement('stock_in')}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Stock In</span>
          </button>
          <button
            type="button"
            onClick={() => openMovement('stock_out')}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Stock Out</span>
          </button>
          <button
            type="button"
            onClick={() => openMovement('damage')}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Damage Stock</span>
          </button>
          <button
            type="button"
            onClick={handleOpenTransfer}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 no-print">
        {[
          {
            id: 'overview' as InventoryTabType,
            label: isBn ? `লাইভ স্টক (${allVariants.length})` : `Live Stock (${allVariants.length})`,
            icon: Boxes,
          },
          {
            id: 'personal_use' as InventoryTabType,
            label: isBn
              ? `ব্যক্তিগত ব্যবহার (${personalUseRecords.length})`
              : `Personal Use (${personalUseRecords.length})`,
            icon: UserMinus,
          },
          {
            id: 'adjustments' as InventoryTabType,
            label: isBn
              ? `স্টক সমন্বয় ও ড্যামেজ (${visibleStockAdjustments.length})`
              : `Adjustments & Loss (${visibleStockAdjustments.length})`,
            icon: SlidersHorizontal,
          },
          {
            id: 'history' as InventoryTabType,
            label: isBn
              ? `স্টক হিস্ট্রি (${visibleStockTransactions.length})`
              : `Stock History (${visibleStockTransactions.length})`,
            icon: History,
          },
          {
            id: 'transfers' as InventoryTabType,
            label: isBn
              ? `স্টক ট্রান্সফার (${visibleStockTransfers.length})`
              : `Transfers (${visibleStockTransfers.length})`,
            icon: ArrowLeftRight,
          },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors min-h-[38px] ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Row (Shared Search + Super Shop Type Filter) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 no-print">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              medEnabled
                ? 'Search by product, generic, company, rack, batch, SKU, barcode...'
                : 'Search by product, rack, SKU, barcode...'
            }
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 min-h-[40px]"
          />
        </div>

        {isSuperShop && (subTab === 'overview' || subTab === 'personal_use' || subTab === 'adjustments') && (
          <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shrink-0">
            {[
              { id: 'all' as const, label: 'All Types' },
              { id: 'general' as const, label: 'Products' },
              { id: 'medicine' as const, label: 'Medicine' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModuleFilter(m.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  moduleFilter === m.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {subTab === 'overview' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                filterType === 'all'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All ({allVariants.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('low')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                filterType === 'low'
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : 'bg-white border-slate-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              Low ({lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('out')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                filterType === 'out'
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50'
              }`}
            >
              Out ({outOfStockCount})
            </button>
            {medEnabled && (
              <button
                type="button"
                onClick={() => setFilterType('expiring')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                  filterType === 'expiring'
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : 'bg-white border-slate-200 text-orange-700 hover:bg-orange-50'
                }`}
              >
                Expiring
              </button>
            )}
          </div>
        )}

        {subTab === 'history' && (
          <select
            value={historyTypeFilter}
            onChange={(e) => setHistoryTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 min-h-[40px]"
          >
            <option value="all">All Movement Types</option>
            <option value="stock_in">Stock In</option>
            <option value="stock_out">Stock Out</option>
            <option value="personal_use">Personal Use</option>
            <option value="purchase">Purchase Inward</option>
            <option value="sale">POS Sale</option>
            <option value="damage">Damage / Missing</option>
            <option value="expired">Expired Stock</option>
            <option value="wastage">Wastage</option>
            <option value="adjustment">Stock Correction</option>
            <option value="transfer">Stock Transfer</option>
            <option value="customer_return">Customer Return</option>
            <option value="supplier_return">Supplier Return</option>
          </select>
        )}
      </div>

      {/* ================================================================== */}
      {/* SUB-TAB 1: LIVE STOCK                                              */}
      {/* ================================================================== */}
      {subTab === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="md:hidden divide-y divide-slate-100">
            {filteredVariants.map((v) => {
              const isOut = v.stock_quantity <= 0;
              const isLow = v.stock_quantity <= v.min_stock_level;
              return (
                <div key={v.id} className="p-3.5 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900">
                        {v.product_name} {medEnabled && v.strength ? `(${v.strength})` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {v.variant_name} {v.rack_number ? `· Rack: ${v.rack_number}` : ''} · {v.barcode}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] shrink-0 ${
                        isOut
                          ? 'bg-rose-600 text-white'
                          : isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {v.stock_quantity} {v.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <div className="font-mono text-[11px] text-slate-600">
                      Buy {store.currency_symbol}
                      {v.purchase_price} · Sale{' '}
                      <strong className="text-slate-900">
                        {store.currency_symbol}
                        {v.selling_price}/{v.unit}
                      </strong>
                      {medEnabled && v.expiry_date && (
                        <span className="block text-[10px] text-slate-500">Exp: {v.expiry_date}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenAdjust(v)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3 h-3 text-emerald-600" />
                      <span>Adjust</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredVariants.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No stock items match your filter.
              </div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] bg-slate-50 font-semibold uppercase">
                  <th className="p-3.5">PRODUCT & VARIANT</th>
                  <th className="p-3.5">SKU / BARCODE</th>
                  <th className="p-3.5 text-right">PURCHASE PRICE</th>
                  <th className="p-3.5 text-right">SELLING PRICE</th>
                  <th className="p-3.5 text-center">CURRENT STOCK</th>
                  {medEnabled && <th className="p-3.5">BATCH & EXPIRY</th>}
                  <th className="p-3.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVariants.map((v) => {
                  const isOut = v.stock_quantity <= 0;
                  const isLow = v.stock_quantity <= v.min_stock_level;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                          <span>{v.product_name}</span>
                          {medEnabled && v.strength && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {v.strength}
                            </span>
                          )}
                          {isSuperShop && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                v.is_medicine
                                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {v.is_medicine ? 'Medicine' : 'Product'}
                            </span>
                          )}
                          {!v.product_active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {v.variant_name}
                          {medEnabled && v.generic_name ? ` · ${v.generic_name}` : ''}
                          {v.rack_number ? ` · Rack: ${v.rack_number}` : ''}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">
                        <div>{v.sku}</div>
                        <div className="text-[10px] text-slate-400">{v.barcode}</div>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600">
                        {store.currency_symbol}
                        {v.purchase_price}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {store.currency_symbol}
                        {v.selling_price}/{v.unit}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded font-mono font-bold text-xs ${
                            isOut
                              ? 'bg-rose-600 text-white'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {v.stock_quantity} {v.unit}
                        </span>
                      </td>
                      {medEnabled && (
                        <td className="p-3.5 text-slate-500">
                          <div className="space-y-0.5 text-[11px]">
                            {v.batch_number && (
                              <div className="font-mono text-slate-700">Batch: {v.batch_number}</div>
                            )}
                            {v.expiry_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-amber-600" />
                                <span>{v.expiry_date}</span>
                              </div>
                            ) : (
                              !v.batch_number && <span className="text-slate-400">N/A</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(v)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Adjust</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredVariants.length === 0 && (
                  <tr>
                    <td colSpan={medEnabled ? 7 : 6} className="p-8 text-center text-slate-400">
                      No stock items match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 2: OWNER & STAFF PERSONAL USE SYSTEM                       */}
      {/* ================================================================== */}
      {subTab === 'personal_use' && (
        <div className="space-y-5">
          {/* KPI Cost Cards (Never counted as Sales Income) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                {isBn ? 'আজকের ব্যক্তিগত ব্যবহার' : "Today's Cost Value"}
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {store.currency_symbol}
                {todayPersonalUseCost.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">At purchase cost (No sale added)</span>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                {isBn ? 'চলতি মাসের খরচ' : 'This Month Cost'}
              </span>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {store.currency_symbol}
                {monthPersonalUseCost.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">{currentMonthStr}</span>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                {isBn ? 'মোট ক্রয়মূল্য ক্ষতি/ব্যবহার' : 'All-Time Cost Value'}
              </span>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                {store.currency_symbol}
                {totalPersonalUseCost.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">{personalUseRecords.length} entries</span>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                {isBn ? 'মোট ইউনিট নেওয়া' : 'Total Units Taken'}
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {totalPersonalUseQty.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Base stock units</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Personal Use Entry Form */}
            <form
              onSubmit={handleSubmitPersonalUse}
              className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs"
            >
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <UserMinus className="w-4 h-4 text-emerald-600" />
                    <span>
                      {isBn ? 'ব্যক্তিগত ব্যবহার এন্ট্রি' : 'Record Owner / Staff Personal Use'}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {isBn
                      ? 'স্টক কমবে এবং ক্রয়মূল্যে হিসাব থাকবে — বিক্রয় আয় হিসেবে যুক্ত হবে না'
                      : 'Deducts stock & tracks purchase cost without creating a sale invoice.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPuType('owner_personal_use');
                    setPuConfirmStep(false);
                  }}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                    puType === 'owner_personal_use'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Owner Personal Use
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPuType('staff_personal_use');
                    setPuConfirmStep(false);
                  }}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                    puType === 'staff_personal_use'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Staff Personal Use
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  {medEnabled ? 'Select Product / Medicine *' : 'Select Product *'}
                </label>
                <input
                  type="text"
                  value={puProdQuery}
                  onChange={(e) => setPuProdQuery(e.target.value)}
                  placeholder="Quick filter item by name, SKU, barcode..."
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
                <select
                  required
                  value={puVariantId}
                  onChange={(e) => {
                    setPuVariantId(e.target.value);
                    setPuConfirmStep(false);
                  }}
                  className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2.5 text-xs font-semibold"
                >
                  {puSelectableVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.product_name} ({v.variant_name}) — Stock: {v.stock_quantity} {v.unit}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPuVariant && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Available Stock</span>
                    <strong className="font-mono text-slate-900">
                      {selectedPuVariant.stock_quantity} {selectedPuVariant.unit}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Purchase Price</span>
                    <strong className="font-mono text-emerald-700">
                      {store.currency_symbol}
                      {selectedPuVariant.purchase_price}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Selling Price</span>
                    <strong className="font-mono text-slate-700">
                      {store.currency_symbol}
                      {selectedPuVariant.selling_price}
                    </strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={puQty}
                    onChange={(e) => {
                      setPuQty(e.target.value);
                      setPuConfirmStep(false);
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={puDate}
                    onChange={(e) => setPuDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="font-semibold text-emerald-900">Total Purchase Cost Value:</span>
                <span className="font-mono font-bold text-base text-emerald-800">
                  {store.currency_symbol}
                  {puEstimatedCost.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Taken By *</label>
                  <input
                    type="text"
                    required
                    value={puTakenBy}
                    onChange={(e) => setPuTakenBy(e.target.value)}
                    placeholder="Owner / Staff name"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason *</label>
                  <input
                    type="text"
                    required
                    value={puReason}
                    onChange={(e) => setPuReason(e.target.value)}
                    placeholder="e.g. Home use"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Note / Description</label>
                <input
                  type="text"
                  value={puNote}
                  onChange={(e) => setPuNote(e.target.value)}
                  placeholder="Optional details..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              {puConfirmStep ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Deduct {puNumericQty} {selectedPuVariant?.unit} of{' '}
                      {selectedPuVariant?.product_name} (Cost: {store.currency_symbol}
                      {puEstimatedCost})?
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPuConfirmStep(false)}
                      className="flex-1 py-2 border border-slate-300 bg-white rounded-xl font-semibold text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : 'Confirm & Deduct'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Save Personal Use Entry
                </button>
              )}
            </form>

            {/* Personal Use History & Reports Panel */}
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'history' as const, label: 'Date History' },
                    { id: 'by_product' as const, label: 'By Product' },
                    { id: 'monthly' as const, label: 'Monthly' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPuViewMode(v.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                        puViewMode === v.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="date"
                    value={puDateFrom}
                    onChange={(e) => setPuDateFrom(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono"
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="date"
                    value={puDateTo}
                    onChange={(e) => setPuDateTo(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => exportAdjustmentsCsv(filteredPersonalUse, 'personal_use')}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {puViewMode === 'history' && (
                <>
                  <div className="md:hidden divide-y divide-slate-100">
                    {filteredPersonalUse.map((r) => (
                      <div key={r.id} className="p-3.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono font-bold text-emerald-700">{r.reference_no}</div>
                            <div className="font-bold text-slate-900">
                              {r.product_name} ({r.variant_name})
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="font-bold text-rose-700">
                              -{r.quantity} {r.unit}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Cost: {store.currency_symbol}
                              {r.total_purchase_value.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {r.date} · By {r.taken_by} · {r.reason}
                        </div>
                      </div>
                    ))}
                    {filteredPersonalUse.length === 0 && (
                      <div className="p-8 text-center text-slate-400">
                        No personal use records found.
                      </div>
                    )}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                          <th className="p-3">DATE & REF</th>
                          <th className="p-3">ITEM</th>
                          <th className="p-3 text-right">QTY</th>
                          <th className="p-3 text-right">COST VALUE</th>
                          <th className="p-3">TAKEN BY & REASON</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPersonalUse.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-[11px]">
                              <div className="font-bold text-emerald-700">{r.reference_no}</div>
                              <div className="text-slate-500">{r.date}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{r.product_name}</div>
                              <div className="text-[11px] text-slate-500">{r.variant_name}</div>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-rose-700">
                              -{r.quantity} {r.unit}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              {store.currency_symbol}
                              {r.total_purchase_value.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{r.taken_by}</div>
                              <div className="text-[11px] text-slate-500">
                                {r.reason}
                                {r.note ? ` · ${r.note}` : ''}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredPersonalUse.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              No personal use records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {puViewMode === 'by_product' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                        <th className="p-3">PRODUCT VARIANT</th>
                        <th className="p-3 text-center">TIMES</th>
                        <th className="p-3 text-right">TOTAL QTY</th>
                        <th className="p-3 text-right">TOTAL COST VALUE</th>
                        <th className="p-3">LAST DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {personalUseByProduct.map((row) => (
                        <tr key={row.key} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{row.product_name}</div>
                            <div className="text-[11px] text-slate-500">{row.variant_name}</div>
                          </td>
                          <td className="p-3 text-center font-mono">{row.count}</td>
                          <td className="p-3 text-right font-mono font-bold text-rose-700">
                            {row.totalQty} {row.unit}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {store.currency_symbol}
                            {row.totalCost.toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{row.lastDate}</td>
                        </tr>
                      ))}
                      {personalUseByProduct.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            No personal use entries yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {puViewMode === 'monthly' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                        <th className="p-3">MONTH</th>
                        <th className="p-3 text-center">ENTRIES</th>
                        <th className="p-3 text-right">TOTAL UNITS</th>
                        <th className="p-3 text-right">TOTAL COST VALUE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {personalUseMonthly.map((m) => (
                        <tr key={m.month} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-900">{m.month}</td>
                          <td className="p-3 text-center font-mono">{m.entries}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-700">
                            {m.totalQty}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            {store.currency_symbol}
                            {m.totalCost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {personalUseMonthly.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">
                            No monthly summary data available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 3: 9-TYPE STOCK ADJUSTMENT & DAMAGE SYSTEM                 */}
      {/* ================================================================== */}
      {subTab === 'adjustments' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* 9-Type Stock Adjustment Entry Form */}
          <form
            onSubmit={handleSubmitFullAdjustment}
            className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs"
          >
            <div className="border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <span>
                  {isBn ? 'স্টক সমন্বয় ও ক্ষতি এন্ট্রি' : 'Stock Adjustment & Loss Entry'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Damaged, Expired, Wastage, Free Sample, Promotional, Missing/Lost or Stock Correction.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adjustment Type *</label>
              <select
                value={adjFormType}
                onChange={(e) => {
                  const val = e.target.value as StockAdjustmentType;
                  setAdjFormType(val);
                  if (val !== 'stock_correction') setAdjDirection('deduct');
                  setAdjConfirmStep(false);
                }}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2.5 text-xs font-bold"
              >
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {isBn ? `${t.labelBn} (${t.labelEn})` : t.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {adjFormType === 'stock_correction' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjDirection('deduct')}
                  className={`py-2 rounded-xl border font-bold cursor-pointer ${
                    adjDirection === 'deduct'
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  - Deduct Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjDirection('add')}
                  className={`py-2 rounded-xl border font-bold cursor-pointer ${
                    adjDirection === 'add'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  + Add Stock
                </button>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Item *</label>
              <select
                required
                value={adjVariantId}
                onChange={(e) => {
                  setAdjVariantId(e.target.value);
                  setAdjConfirmStep(false);
                }}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2.5 text-xs font-semibold"
              >
                {allVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.product_name} ({v.variant_name}) — Stock: {v.stock_quantity} {v.unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={adjFormQty}
                  onChange={(e) => {
                    setAdjFormQty(e.target.value);
                    setAdjConfirmStep(false);
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={adjFormDate}
                  onChange={(e) => setAdjFormDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-slate-700">Estimated Cost Impact:</span>
              <span className="font-mono font-bold text-slate-900">
                {store.currency_symbol}
                {adjEstimatedCost.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Authorized / Taken By</label>
                <input
                  type="text"
                  value={adjFormTakenBy}
                  onChange={(e) => setAdjFormTakenBy(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason *</label>
                <input
                  type="text"
                  required
                  value={adjFormReason}
                  onChange={(e) => setAdjFormReason(e.target.value)}
                  placeholder="Specify reason..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={adjFormNote}
                onChange={(e) => setAdjFormNote(e.target.value)}
                placeholder="Optional audit note..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            {adjConfirmStep ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-amber-900">
                  Confirm {getAdjTypeMeta(adjFormType).labelEn}: {adjDirection === 'add' && adjFormType === 'stock_correction' ? '+' : '-'}
                  {adjNumericQty} {selectedAdjVariant?.unit} of {selectedAdjVariant?.product_name}?
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjConfirmStep(false)}
                    className="flex-1 py-2 border border-slate-300 bg-white rounded-xl font-semibold text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    {isSubmitting ? 'Applying...' : 'Confirm Adjustment'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer transition-colors"
              >
                Record Stock Adjustment
              </button>
            )}
          </form>

          {/* Adjustments History Table */}
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <select
                value={adjFilterType}
                onChange={(e) => setAdjFilterType(e.target.value as 'all' | StockAdjustmentType)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700"
              >
                <option value="all">All 9 Adjustment Types</option>
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.labelEn}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => exportAdjustmentsCsv(filteredAdjustments, 'stock_adjustments')}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {filteredAdjustments.map((r) => {
                const meta = getAdjTypeMeta(r.adjustment_type);
                return (
                  <div key={r.id} className="p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${meta.badgeColor}`}>
                          {meta.labelEn}
                        </span>
                        <div className="font-bold text-slate-900 mt-1">
                          {r.product_name} ({r.variant_name})
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className={`font-bold ${r.direction === 'add' ? 'text-emerald-600' : 'text-rose-700'}`}>
                          {r.direction === 'add' ? '+' : '-'}
                          {r.quantity} {r.unit}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {store.currency_symbol}
                          {r.total_purchase_value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {r.reference_no} · {r.date} · {r.reason}
                    </div>
                  </div>
                );
              })}
              {filteredAdjustments.length === 0 && (
                <div className="p-8 text-center text-slate-400">No stock adjustment records yet.</div>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="p-3">REF & DATE</th>
                    <th className="p-3">TYPE</th>
                    <th className="p-3">ITEM</th>
                    <th className="p-3 text-right">QTY</th>
                    <th className="p-3 text-right">COST VALUE</th>
                    <th className="p-3">REASON & BY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdjustments.map((r) => {
                    const meta = getAdjTypeMeta(r.adjustment_type);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-[11px]">
                          <div className="font-bold text-emerald-700">{r.reference_no}</div>
                          <div className="text-slate-500">{r.date}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeColor}`}>
                            {meta.labelEn}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{r.product_name}</div>
                          <div className="text-[11px] text-slate-500">{r.variant_name}</div>
                        </td>
                        <td
                          className={`p-3 text-right font-mono font-bold ${
                            r.direction === 'add' ? 'text-emerald-600' : 'text-rose-700'
                          }`}
                        >
                          {r.direction === 'add' ? '+' : '-'}
                          {r.quantity} {r.unit}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {store.currency_symbol}
                          {r.total_purchase_value.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="text-slate-800 font-medium">{r.reason}</div>
                          <div className="text-[11px] text-slate-500">By: {r.taken_by}</div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAdjustments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No stock adjustment records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 4: STOCK HISTORY LEDGER                                    */}
      {/* ================================================================== */}
      {subTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="md:hidden divide-y divide-slate-100">
            {filteredHistory.map((tx) => (
              <div key={tx.id} className="p-3.5 space-y-1.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800">{tx.product_name}</div>
                    <div className="text-[11px] text-slate-500">
                      {tx.variant_name} · {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`font-mono font-bold ${
                      tx.quantity_change > 0
                        ? 'text-emerald-600'
                        : tx.quantity_change < 0
                        ? 'text-rose-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                  <span className="uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-100">
                    {tx.transaction_type.replace('_', ' ')}
                  </span>
                  <span className="font-mono">
                    {tx.previous_stock} → <strong className="text-slate-900">{tx.new_stock}</strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {tx.reason} · By {tx.user_name}
                </div>
              </div>
            ))}
            {filteredHistory.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No stock movement transactions recorded yet.
              </div>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold uppercase text-[11px]">
                  <th className="p-3.5">DATE & TIME</th>
                  <th className="p-3.5">PRODUCT VARIANT</th>
                  <th className="p-3.5 text-center">TYPE</th>
                  <th className="p-3.5 text-right">CHANGE</th>
                  <th className="p-3.5 text-right">PREV → NEW</th>
                  <th className="p-3.5">REF / REASON</th>
                  <th className="p-3.5">BY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{tx.product_name}</div>
                      <div className="text-[11px] text-slate-500">{tx.variant_name}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.quantity_change > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.quantity_change < 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tx.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td
                      className={`p-3.5 text-right font-mono font-bold ${
                        tx.quantity_change > 0
                          ? 'text-emerald-600'
                          : tx.quantity_change < 0
                          ? 'text-rose-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      {tx.previous_stock} → <strong className="text-slate-900">{tx.new_stock}</strong>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {tx.reference_no && (
                        <span className="font-mono text-[10px] text-emerald-700 block">
                          Ref: {tx.reference_no}
                        </span>
                      )}
                      <span>{tx.reason}</span>
                    </td>
                    <td className="p-3.5 text-slate-500">{tx.user_name}</td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No stock movement transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 5: STOCK TRANSFERS                                         */}
      {/* ================================================================== */}
      {subTab === 'transfers' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="md:hidden divide-y divide-slate-100">
            {visibleStockTransfers.map((tr) => (
              <div key={tr.id} className="p-3.5 space-y-1.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-emerald-600">{tr.transfer_number}</div>
                    <div className="font-bold text-slate-800">
                      {tr.product_name} ({tr.variant_name})
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {tr.quantity} {tr.unit}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  {tr.from_location} → <strong className="text-emerald-700">{tr.to_location}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  {tr.date} · By {tr.transferred_by}
                </div>
              </div>
            ))}
            {visibleStockTransfers.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No stock transfers recorded yet. Click &ldquo;Transfer&rdquo; above to move stock between racks or branches.
              </div>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold uppercase text-[11px]">
                  <th className="p-3.5">TRANSFER #</th>
                  <th className="p-3.5">DATE</th>
                  <th className="p-3.5">ITEM VARIANT</th>
                  <th className="p-3.5 text-center">QTY</th>
                  <th className="p-3.5">FROM LOCATION</th>
                  <th className="p-3.5">TO LOCATION</th>
                  <th className="p-3.5">BY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStockTransfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{tr.transfer_number}</td>
                    <td className="p-3.5 font-mono text-slate-500">{tr.date}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{tr.product_name}</div>
                      <div className="text-[11px] text-slate-500">{tr.variant_name}</div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold">
                      {tr.quantity} {tr.unit}
                    </td>
                    <td className="p-3.5 text-slate-700">{tr.from_location}</td>
                    <td className="p-3.5 font-semibold text-emerald-700">{tr.to_location}</td>
                    <td className="p-3.5 text-slate-500">{tr.transferred_by}</td>
                  </tr>
                ))}
                {visibleStockTransfers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No stock transfers recorded yet. Click &ldquo;Transfer&rdquo; above to move stock between shelves, racks, or branches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK ADJUSTMENT MODAL */}
      {showAdjModal && selectedVariant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Sliders className="w-5 h-5 text-emerald-600" />
                <span>Adjust Stock Quantity</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAdjModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-4 my-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">{selectedVariant.variant_name}</div>
                <div className="text-slate-500">
                  Current System Stock: {selectedVariant.stock_quantity} {selectedVariant.unit}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter Actual Physical Stock Quantity:
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-center text-2xl font-mono text-emerald-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment *
                </label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  <option value="Physical Count Correction">Physical Count Correction</option>
                  <option value="Damaged / Spoiled Goods">Damaged / Spoiled Goods</option>
                  <option value="Expired Product">Expired Product</option>
                  <option value="Wastage / Theft">Wastage / Theft</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK IN / STOCK OUT / DAMAGE MODAL */}
      {movementModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {movementModal === 'stock_in' && <ArrowDownToLine className="w-5 h-5 text-emerald-600" />}
                {movementModal === 'stock_out' && <ArrowUpFromLine className="w-5 h-5 text-amber-600" />}
                {movementModal === 'damage' && <Flame className="w-5 h-5 text-rose-600" />}
                <span>
                  {movementModal === 'stock_in'
                    ? 'Record Stock In'
                    : movementModal === 'stock_out'
                    ? 'Record Stock Out'
                    : 'Write Off Damage / Wastage Stock'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setMovementModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmMovement} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Item *</label>
                <select
                  required
                  value={mvVariantId}
                  onChange={(e) => setMvVariantId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  {allVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.product_name} — {v.variant_name} (Stock: {v.stock_quantity} {v.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={mvQty}
                    onChange={(e) => setMvQty(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reference #</label>
                  <input
                    type="text"
                    value={mvRef}
                    onChange={(e) => setMvRef(e.target.value)}
                    placeholder="Optional ref #"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Notes *</label>
                <input
                  type="text"
                  required
                  value={mvReason}
                  onChange={(e) => setMvReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMovementModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl text-xs font-bold cursor-pointer ${
                    movementModal === 'stock_in'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : movementModal === 'stock_out'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
                <span>Stock Transfer</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Variant *</label>
                <select
                  required
                  value={trVariantId}
                  onChange={(e) => setTrVariantId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  {allVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.product_name} — {v.variant_name} ({v.stock_quantity} {v.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={trQty}
                  onChange={(e) => setTrQty(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">From Location *</label>
                  <input
                    type="text"
                    required
                    value={trFrom}
                    onChange={(e) => setTrFrom(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">To Location *</label>
                  <input
                    type="text"
                    required
                    value={trTo}
                    onChange={(e) => setTrTo(e.target.value)}
                    placeholder="e.g. Rack B2 or Branch 2"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Notes</label>
                <input
                  type="text"
                  value={trNotes}
                  onChange={(e) => setTrNotes(e.target.value)}
                  placeholder="Note: Including 'Branch' in destination deducts main store stock."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Record Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
