import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  Tag,
  Award,
  Ruler,
  Boxes,
  Barcode,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Upload,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Brand,
  Category,
  PackagingUnitConfig,
  Product,
  ProductVariant,
  UnitDefinition,
} from '../../types';
import {
  formatStockBreakdown,
  getVariantBaseUnit,
  getVariantPackagingOptions,
} from '../../utils/packaging';

type GeneralSubTab =
  | 'list'
  | 'categories'
  | 'brands'
  | 'units'
  | 'stock'
  | 'barcode';

const renderBarcodeSvg = (code: string) => {
  const safeCode = code || '00000000';
  const bars: { width: number; isBlack: boolean }[] = [
    { width: 2, isBlack: true },
    { width: 1, isBlack: false },
    { width: 2, isBlack: true },
  ];
  for (let i = 0; i < safeCode.length; i++) {
    const digit = parseInt(safeCode[i], 10) || (safeCode.charCodeAt(i) % 7);
    bars.push({ width: (digit % 3) + 1, isBlack: false });
    bars.push({ width: ((digit + 1) % 3) + 1, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: (digit % 2) + 1, isBlack: true });
  }
  bars.push(
    { width: 2, isBlack: true },
    { width: 1, isBlack: false },
    { width: 2, isBlack: true }
  );

  let currentX = 0;
  const rects = bars.map((b, idx) => {
    const x = currentX;
    currentX += b.width * 2;
    return b.isBlack ? (
      <rect key={idx} x={x} y="0" width={b.width * 2} height="38" fill="#000000" />
    ) : null;
  });

  return (
    <svg viewBox={`0 0 ${currentX} 38`} className="w-full h-9 my-1" preserveAspectRatio="none">
      {rects}
    </svg>
  );
};

export const GeneralProductManagement: React.FC<{ initialTab?: GeneralSubTab }> = ({ initialTab }) => {
  const {
    store,
    updateStore,
    products,
    categories,
    brands,
    units,
    suppliers,
    saveProduct,
    archiveProduct,
    adjustStock,
    saveCategory,
    deleteCategory,
    saveBrand,
    deleteBrand,
    saveUnit,
    deleteUnit,
    checkPermission,
  } = useApp();

  const isModuleEnabled = store.module_general_product_enabled !== false;
  const canManageSettings = checkPermission('settings_manage');
  const canEditProducts = checkPermission('product_manage');

  const [subTab, setSubTab] = useState<GeneralSubTab>(initialTab || 'list');
  useEffect(() => {
    if (initialTab) {
      setSubTab(initialTab);
    }
  }, [initialTab]);
  const [search, setSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');
  const [toast, setToast] = useState<string | null>(null);

  interface GenVariantDraft {
    id: string;
    variant_name: string; // e.g. '100ml', '200ml', '500ml', 'Standard'
    sku: string;
    barcode: string;
    base_unit: string;
    // Packaging conversion tiers into base unit
    use_carton: boolean;
    carton_unit_name: string;
    carton_factor: string; // base units per 1 Carton (e.g. 24)
    carton_barcode: string;
    carton_purchase_price: string;
    carton_sale_price: string;
    carton_mrp: string;
    use_box: boolean;
    box_unit_name: string;
    box_factor: string; // base units per 1 Box (e.g. 12)
    box_barcode: string;
    box_purchase_price: string;
    box_sale_price: string;
    box_mrp: string;
    base_purchase_price: string;
    base_sale_price: string;
    base_mrp: string;
    opening_stock: string; // always in base unit
    min_stock_level: string;
    supplier_id: string;
    expiry_date: string;
    warranty: string;
    discount_percentage: string;
    active: boolean;
  }

  // Add/Edit Product Modal
  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [modalSectionTab, setModalSectionTab] = useState<'basic' | 'packaging' | 'stock'>('basic');
  const [formError, setFormError] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodBrandId, setProdBrandId] = useState('');
  const [prodBrandName, setProdBrandName] = useState('');
  const [prodUnit, setProdUnit] = useState('Packet');
  const [prodRack, setProdRack] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodActive, setProdActive] = useState(true);
  const [variantDrafts, setVariantDrafts] = useState<GenVariantDraft[]>([]);
  const [activeVariantIdx, setActiveVariantIdx] = useState<number>(0);

  // Category CRUD state
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Brand CRUD state
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Unit CRUD state
  const [unitName, setUnitName] = useState('');
  const [unitShort, setUnitShort] = useState('');
  const [unitDecimal, setUnitDecimal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitDefinition | null>(null);

  // Quick Stock Adjust Modal
  const [stockEditTarget, setStockEditTarget] = useState<{
    product: Product;
    variant: ProductVariant;
    newStock: string;
    reason: string;
  } | null>(null);

  // Barcode Sheet State
  const [selectedBarcodeVariantId, setSelectedBarcodeVariantId] = useState<string>('');
  const [barcodeLabelQty, setBarcodeLabelQty] = useState<number>(12);

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const toggleModule = () => {
    updateStore({
      ...store,
      module_general_product_enabled: !isModuleEnabled,
    });
    showNotice(
      !isModuleEnabled
        ? 'General Product Management module turned ON.'
        : 'General Product Management module turned OFF.'
    );
  };

  const generalProducts = useMemo(
    () =>
      products.filter(
        (p) => !p.archived && !p.is_medicine && p.category_id !== 'cat_medicine'
      ),
    [products]
  );

  const generalCategories = useMemo(
    () => categories.filter((c) => c.id !== 'cat_medicine' && c.category_type !== 'medicine'),
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return generalProducts.filter((p) => {
      if (selectedCatFilter !== 'all' && p.category_id !== selectedCatFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.brand_name || '').toLowerCase().includes(q) ||
        p.variants.some((v) => v.barcode.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q))
      );
    });
  }, [generalProducts, search, selectedCatFilter]);

  const flatVariants = useMemo(
    () => generalProducts.flatMap((p) => p.variants.map((v) => ({ product: p, variant: v }))),
    [generalProducts]
  );

  const createEmptyGenVariantDraft = (index = 0, baseUnit = 'Packet'): GenVariantDraft => {
    const ts = Date.now().toString().slice(-4);
    return {
      id: `var_${Date.now()}_${index}`,
      variant_name: index === 0 ? 'Standard' : '',
      sku: `PRD${ts}-${index + 1}`,
      barcode: `${store.barcode_prefix || '894'}${(Date.now() + index).toString().slice(-8)}`,
      base_unit: baseUnit,
      use_carton: true,
      carton_unit_name: 'Carton',
      carton_factor: '24',
      carton_barcode: '',
      carton_purchase_price: '',
      carton_sale_price: '',
      carton_mrp: '',
      use_box: true,
      box_unit_name: 'Box',
      box_factor: '12',
      box_barcode: '',
      box_purchase_price: '',
      box_sale_price: '',
      box_mrp: '',
      base_purchase_price: '',
      base_sale_price: '',
      base_mrp: '',
      opening_stock: '0',
      min_stock_level: '10',
      supplier_id: suppliers[0]?.id || '',
      expiry_date: '',
      warranty: '',
      discount_percentage: '0',
      active: true,
    };
  };

  const openAddProduct = () => {
    const defaultBase = units.find((u) => u.name !== 'Strip' && u.name !== 'Tablet')?.name || 'Packet';
    setEditingProd(null);
    setModalSectionTab('basic');
    setFormError('');
    setProdName('');
    setProdCode(`PRD-${Date.now().toString().slice(-4)}`);
    setProdCategory(generalCategories[0]?.id || categories[0]?.id || 'cat_1');
    setProdBrandId('');
    setProdBrandName('');
    setProdUnit(defaultBase);
    setProdRack('');
    setProdImage('');
    setProdDesc('');
    setProdActive(true);
    setVariantDrafts([createEmptyGenVariantDraft(0, defaultBase)]);
    setActiveVariantIdx(0);
    setShowProdModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProd(p);
    setModalSectionTab('basic');
    setFormError('');
    setProdName(p.name);
    setProdCode(p.code);
    setProdCategory(p.category_id);
    setProdBrandId(p.brand_id || p.variants[0]?.brand_id || '');
    setProdBrandName(p.brand_name || '');
    setProdUnit(p.variants[0] ? getVariantBaseUnit(p.variants[0]) : 'Packet');
    setProdRack(p.rack_number || '');
    setProdImage(p.image || '');
    setProdDesc(p.description || '');
    setProdActive(p.active !== false);

    const drafts: GenVariantDraft[] = p.variants.map((v, idx) => {
      const baseUnit = getVariantBaseUnit(v);
      const pkgs = getVariantPackagingOptions(v);
      const basePkg = pkgs.find((u) => u.conversion_factor === 1 || u.is_base);
      const higher = pkgs.filter((u) => u.conversion_factor > 1).sort((a, b) => b.conversion_factor - a.conversion_factor);
      const tier1 = higher.find((u) => u.unit_name.toLowerCase().includes('carton')) || higher[0];
      const tier2 =
        higher.find((u) => u.id !== tier1?.id && (u.unit_name.toLowerCase().includes('box') || u.unit_name.toLowerCase().includes('pack'))) ||
        (higher.length > 1 ? higher[1] : undefined);

      return {
        id: v.id || `var_${Date.now()}_${idx}`,
        variant_name: v.variant_name || 'Standard',
        sku: v.sku || `${p.code}-${idx + 1}`,
        barcode: v.barcode || '',
        base_unit: baseUnit,
        use_carton: Boolean(tier1),
        carton_unit_name: tier1?.unit_name || 'Carton',
        carton_factor: tier1 ? String(tier1.conversion_factor) : '24',
        carton_barcode: tier1?.barcode || '',
        carton_purchase_price: tier1 ? String(tier1.purchase_price) : '',
        carton_sale_price: tier1 ? String(tier1.selling_price) : '',
        carton_mrp: tier1 ? String(tier1.mrp) : '',
        use_box: Boolean(tier2),
        box_unit_name: tier2?.unit_name || 'Box',
        box_factor: tier2 ? String(tier2.conversion_factor) : '12',
        box_barcode: tier2?.barcode || '',
        box_purchase_price: tier2 ? String(tier2.purchase_price) : '',
        box_sale_price: tier2 ? String(tier2.selling_price) : '',
        box_mrp: tier2 ? String(tier2.mrp) : '',
        base_purchase_price: String(basePkg?.purchase_price ?? v.purchase_price ?? ''),
        base_sale_price: String(basePkg?.selling_price ?? v.selling_price ?? ''),
        base_mrp: String(basePkg?.mrp ?? v.mrp ?? v.selling_price ?? ''),
        opening_stock: String(v.stock_quantity ?? 0),
        min_stock_level: String(v.min_stock_level ?? 5),
        supplier_id: v.supplier_id || suppliers[0]?.id || '',
        expiry_date: v.expiry_date || '',
        warranty: v.warranty || '',
        discount_percentage: String(v.discount_percentage ?? 0),
        active: v.active !== false,
      };
    });

    setVariantDrafts(drafts.length > 0 ? drafts : [createEmptyGenVariantDraft(0, 'Packet')]);
    setActiveVariantIdx(0);
    setShowProdModal(true);
  };

  const updateGenVariantDraft = (idx: number, patch: Partial<GenVariantDraft>) => {
    setVariantDrafts((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        const next = { ...d, ...patch };
        const cFactor = Math.max(1, parseFloat(next.carton_factor) || 24);
        const bFactor = Math.max(1, parseFloat(next.box_factor) || 12);

        if ('base_purchase_price' in patch || 'carton_factor' in patch || 'box_factor' in patch) {
          const bp = parseFloat(next.base_purchase_price);
          if (Number.isFinite(bp) && bp > 0) {
            if (next.use_box && (!d.box_purchase_price || 'base_purchase_price' in patch || 'box_factor' in patch)) {
              next.box_purchase_price = String(Math.round(bp * bFactor * 100) / 100);
            }
            if (next.use_carton && (!d.carton_purchase_price || 'base_purchase_price' in patch || 'carton_factor' in patch)) {
              next.carton_purchase_price = String(Math.round(bp * cFactor * 100) / 100);
            }
          }
        }
        if ('base_sale_price' in patch || 'carton_factor' in patch || 'box_factor' in patch) {
          const bs = parseFloat(next.base_sale_price);
          if (Number.isFinite(bs) && bs > 0) {
            if (next.use_box && (!d.box_sale_price || 'base_sale_price' in patch || 'box_factor' in patch)) {
              next.box_sale_price = String(Math.round(bs * bFactor * 100) / 100);
            }
            if (next.use_carton && (!d.carton_sale_price || 'base_sale_price' in patch || 'carton_factor' in patch)) {
              next.carton_sale_price = String(Math.round(bs * cFactor * 100) / 100);
            }
          }
        }
        if ('base_mrp' in patch || 'carton_factor' in patch || 'box_factor' in patch) {
          const bm = parseFloat(next.base_mrp);
          if (Number.isFinite(bm) && bm > 0) {
            if (next.use_box && (!d.box_mrp || 'base_mrp' in patch || 'box_factor' in patch)) {
              next.box_mrp = String(Math.round(bm * bFactor * 100) / 100);
            }
            if (next.use_carton && (!d.carton_mrp || 'base_mrp' in patch || 'carton_factor' in patch)) {
              next.carton_mrp = String(Math.round(bm * cFactor * 100) / 100);
            }
          }
        }
        return next;
      })
    );
  };

  const handleSaveProduct = (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();
    setFormError('');
    if (!prodName.trim()) {
      setFormError('Product Name is required.');
      setModalSectionTab('basic');
      return;
    }
    if (variantDrafts.length === 0) {
      setFormError('Add at least one variant.');
      setModalSectionTab('basic');
      return;
    }

    const now = new Date().toISOString();
    const prodId = editingProd?.id || `prod_${Date.now()}`;
    const selectedBrand = brands.find((b) => b.id === prodBrandId);
    const builtVariants: ProductVariant[] = [];

    for (let idx = 0; idx < variantDrafts.length; idx++) {
      const d = variantDrafts[idx];
      const basePurchase = parseFloat(d.base_purchase_price) || 0;
      const baseSale = parseFloat(d.base_sale_price) || 0;
      const baseMrp = parseFloat(d.base_mrp) || baseSale;
      const boxSale = parseFloat(d.box_sale_price) || 0;
      const cartonSale = parseFloat(d.carton_sale_price) || 0;

      if (baseSale <= 0 && boxSale <= 0 && cartonSale <= 0) {
        setFormError(`Please enter a valid Sale Price for variant "${d.variant_name || `#${idx + 1}`}".`);
        setActiveVariantIdx(idx);
        setModalSectionTab('packaging');
        return;
      }

      const bFactor = Math.max(1, parseFloat(d.box_factor) || 12);
      const cFactor = Math.max(1, parseFloat(d.carton_factor) || 24);
      const resolvedBaseSale =
        baseSale > 0
          ? baseSale
          : d.use_box && boxSale > 0
          ? Math.round((boxSale / bFactor) * 100) / 100
          : Math.round((cartonSale / cFactor) * 100) / 100;
      const resolvedBasePurchase =
        basePurchase > 0
          ? basePurchase
          : d.use_box && (parseFloat(d.box_purchase_price) || 0) > 0
          ? Math.round(((parseFloat(d.box_purchase_price) || 0) / bFactor) * 100) / 100
          : Math.round(((parseFloat(d.carton_purchase_price) || 0) / cFactor) * 100) / 100;
      const resolvedBaseMrp = baseMrp > 0 ? baseMrp : resolvedBaseSale;

      const packagingUnits: PackagingUnitConfig[] = [
        {
          id: `pkg_base_${d.id}`,
          unit_name: d.base_unit || prodUnit || 'Packet',
          conversion_factor: 1,
          is_base: true,
          barcode: d.barcode.trim(),
          purchase_price: resolvedBasePurchase,
          selling_price: resolvedBaseSale,
          mrp: resolvedBaseMrp,
        },
      ];

      if (d.use_box && d.box_unit_name.trim()) {
        packagingUnits.push({
          id: `pkg_box_${d.id}`,
          unit_name: d.box_unit_name.trim(),
          conversion_factor: bFactor,
          is_base: false,
          barcode: d.box_barcode.trim() || undefined,
          purchase_price: parseFloat(d.box_purchase_price) || Math.round(resolvedBasePurchase * bFactor * 100) / 100,
          selling_price: boxSale || Math.round(resolvedBaseSale * bFactor * 100) / 100,
          mrp: parseFloat(d.box_mrp) || Math.round(resolvedBaseMrp * bFactor * 100) / 100,
        });
      }

      if (d.use_carton && d.carton_unit_name.trim()) {
        packagingUnits.push({
          id: `pkg_carton_${d.id}`,
          unit_name: d.carton_unit_name.trim(),
          conversion_factor: cFactor,
          is_base: false,
          barcode: d.carton_barcode.trim() || undefined,
          purchase_price: parseFloat(d.carton_purchase_price) || Math.round(resolvedBasePurchase * cFactor * 100) / 100,
          selling_price: cartonSale || Math.round(resolvedBaseSale * cFactor * 100) / 100,
          mrp: parseFloat(d.carton_mrp) || Math.round(resolvedBaseMrp * cFactor * 100) / 100,
        });
      }

      const existingV = editingProd?.variants.find((ev) => ev.id === d.id);
      builtVariants.push({
        id: existingV?.id || d.id || `var_${Date.now()}_${idx}`,
        product_id: prodId,
        variant_name: d.variant_name.trim() || d.base_unit || 'Standard',
        sku: d.sku.trim() || `${prodCode || 'PRD'}-${idx + 1}`,
        barcode: d.barcode.trim() || `${store.barcode_prefix || '894'}${(Date.now() + idx).toString().slice(-8)}`,
        brand_id: prodBrandId || undefined,
        unit: d.base_unit || prodUnit || 'Packet',
        base_unit: d.base_unit || prodUnit || 'Packet',
        packaging_units: packagingUnits.sort((a, b) => b.conversion_factor - a.conversion_factor),
        purchase_price: resolvedBasePurchase,
        selling_price: resolvedBaseSale,
        mrp: resolvedBaseMrp,
        discount_percentage: parseFloat(d.discount_percentage) || 0,
        stock_quantity: Math.max(0, parseFloat(d.opening_stock) || 0),
        min_stock_level: Math.max(0, parseFloat(d.min_stock_level) || 5),
        supplier_id: d.supplier_id || undefined,
        expiry_date: d.expiry_date || undefined,
        warranty: d.warranty.trim() || undefined,
        active: prodActive && d.active,
        created_at: existingV?.created_at || now,
        updated_at: now,
        sync_status: 'pending',
        branch_id: store.branch_id,
        device_id: store.device_id,
      });
    }

    saveProduct({
      id: prodId,
      name: prodName.trim(),
      brand_id: prodBrandId || undefined,
      brand_name: selectedBrand?.name || prodBrandName.trim() || undefined,
      rack_number: prodRack.trim() || undefined,
      is_medicine: false,
      active: prodActive,
      description: prodDesc.trim() || undefined,
      category_id: prodCategory || 'cat_1',
      image: prodImage.trim() || undefined,
      code: prodCode.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      variants: builtVariants,
      archived: false,
      created_at: editingProd?.created_at || now,
      updated_at: now,
      sync_status: 'pending',
      branch_id: store.branch_id,
      device_id: store.device_id,
    });

    showNotice(
      editingProd
        ? 'Product updated with variants & packaging.'
        : `Saved "${prodName.trim()}" (${builtVariants.length} variant${builtVariants.length > 1 ? 's' : ''}).`
    );

    if (addAnother) {
      openAddProduct();
    } else {
      setShowProdModal(false);
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    saveCategory({
      id: editingCat?.id || `cat_gen_${Date.now()}`,
      name: catName.trim(),
      code: catCode.trim().toUpperCase() || catName.trim().slice(0, 3).toUpperCase(),
      description: catDesc.trim() || undefined,
      category_type: 'general',
      active: editingCat ? editingCat.active : true,
    });
    setCatName('');
    setCatCode('');
    setCatDesc('');
    setEditingCat(null);
    showNotice('Product category saved.');
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    saveBrand({
      id: editingBrand?.id || `brand_${Date.now()}`,
      name: brandName.trim(),
      description: brandDesc.trim() || undefined,
      active: true,
      created_at: editingBrand?.created_at || new Date().toISOString(),
    });
    setBrandName('');
    setBrandDesc('');
    setEditingBrand(null);
    showNotice('Brand saved.');
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !unitShort.trim()) return;
    saveUnit({
      id: editingUnit?.id || `unit_${Date.now()}`,
      name: unitName.trim(),
      short_name: unitShort.trim(),
      is_decimal_allowed: unitDecimal,
      active: true,
    });
    setUnitName('');
    setUnitShort('');
    setUnitDecimal(false);
    setEditingUnit(null);
    showNotice('Unit saved.');
  };

  const selectedBarcodeItem =
    flatVariants.find((i) => i.variant.id === selectedBarcodeVariantId) ||
    flatVariants[0] ||
    null;

  if (!isModuleEnabled) {
    return (
      <div className="p-6 max-w-2xl mx-auto my-12">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">General Product Management is Turned OFF</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            General Retail & Grocery product tools (Products, Categories, Brands, Units, Stock & Barcodes) are currently turned off.
          </p>
          {canManageSettings && (
            <button
              type="button"
              onClick={toggleModule}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Power className="w-4 h-4" />
              <span>Turn General Product Module ON</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-5">
      {/* Header + Module ON/OFF Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#0b6ff2] to-[#1b8cff] text-white flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">General Product Management</h1>
            <p className="text-xs text-slate-500">
              Add Product, Product Categories, Brand Management, Unit Management, Stock & Barcodes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManageSettings && (
            <button
              type="button"
              onClick={toggleModule}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Module: ON</span>
            </button>
          )}
          {canEditProducts && (
            <button
              type="button"
              onClick={openAddProduct}
              className="px-4 py-2 rounded-xl bg-[#0f6ae6] hover:bg-[#0c56bd] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 no-print">
        {[
          { id: 'list', label: 'Product List', icon: Package },
          { id: 'categories', label: 'Product Categories', icon: Tag },
          { id: 'brands', label: 'Brand Management', icon: Award },
          { id: 'units', label: 'Unit Management', icon: Ruler },
          { id: 'stock', label: 'Product Stock', icon: Boxes },
          { id: 'barcode', label: 'Product Barcode', icon: Barcode },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as GeneralSubTab)}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 leading-tight transition-colors cursor-pointer ${
                active
                  ? 'bg-[#0f6ae6] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PRODUCT LIST */}
      {subTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product name, brand, code, barcode..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#5b46b5]"
              />
            </div>
            <select
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
            >
              <option value="all">All Categories</option>
              {generalCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Product Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredProducts.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">No general products found.</div>
            ) : (
              filteredProducts.map((p) => {
                const v = p.variants[0];
                const cat = categories.find((c) => c.id === p.category_id);
                const totalStock = p.variants.reduce((s, item) => s + item.stock_quantity, 0);
                return (
                  <div key={p.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {p.name}
                            {p.variants.length > 1 && (
                              <span className="ml-1 text-[10px] font-mono text-indigo-600">({p.variants.length}v)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">
                            {cat?.name || 'General'} · {p.brand_name || '—'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {v?.barcode || p.code} · Rack: {p.rack_number || '—'}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        p.active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {p.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Buy</span>
                        <span className="font-mono text-slate-700">{store.currency_symbol}{v?.purchase_price ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Sale Price</span>
                        <span className="font-mono font-bold text-slate-900">{store.currency_symbol}{v?.selling_price ?? 0}/{v ? getVariantBaseUnit(v) : 'pc'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Stock</span>
                        <span className={`font-mono font-bold ${totalStock <= (v?.min_stock_level || 5) ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {v ? formatStockBreakdown(totalStock, v) : totalStock}
                        </span>
                      </div>
                    </div>
                    {canEditProducts && (
                      <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
                        <button type="button" onClick={() => openEditProduct(p)} className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer">
                          <Edit2 className="w-3 h-3 text-indigo-600" />
                          <span>Edit</span>
                        </button>
                        <button type="button" onClick={() => { archiveProduct(p.id); showNotice(`Archived ${p.name}`); }} className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                          <span>Archive</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3">Rack / Unit</th>
                  <th className="py-2.5 px-3 text-right">Purchase / Sale / MRP</th>
                  <th className="py-2.5 px-3 text-right">Stock</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No general products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const v = p.variants[0];
                    const cat = categories.find((c) => c.id === p.category_id);
                    const totalStock = p.variants.reduce((s, item) => s + item.stock_quantity, 0);
                    const pkgCount = v ? getVariantPackagingOptions(v).length : 1;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-pink-50 text-[#ec1f73] flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900">
                                {p.name}
                                {p.variants.length > 1 && (
                                  <span className="ml-1.5 text-[10px] font-mono text-[#5b46b5]">
                                    ({p.variants.length} variants)
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {v?.barcode || p.code}
                                {pkgCount > 1 ? ` · ${pkgCount} pack tiers` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{cat?.name || 'General'}</td>
                        <td className="py-2.5 px-3 text-slate-700">{p.brand_name || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{v ? getVariantBaseUnit(v) : 'Piece'}</div>
                          <div className="text-[10px] text-slate-400">Rack: {p.rack_number || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          <div className="text-slate-500">{store.currency_symbol}{v?.purchase_price ?? 0}</div>
                          <div className="font-bold text-slate-900">
                            {store.currency_symbol}{v?.selling_price ?? 0}
                            <span className="text-[10px] font-normal text-slate-400">/{v ? getVariantBaseUnit(v) : ''}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">MRP: {store.currency_symbol}{v?.mrp ?? v?.selling_price ?? 0}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                          <span className={totalStock <= (v?.min_stock_level || 5) ? 'text-rose-600' : 'text-emerald-700'}>
                            {v ? formatStockBreakdown(totalStock, v) : totalStock}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              p.active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {p.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {canEditProducts && (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditProduct(p)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  archiveProduct(p.id);
                                  showNotice(`Archived ${p.name}`);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT CATEGORIES */}
      {subTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={handleSaveCategory} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 h-fit">
            <h2 className="text-sm font-bold text-slate-900">
              {editingCat ? 'Edit Product Category' : 'Add Product Category'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Cosmetics & Personal Care"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
              <input
                type="text"
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                placeholder="e.g. COS"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              {editingCat && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCat(null);
                    setCatName('');
                    setCatCode('');
                    setCatDesc('');
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2 bg-[#5b46b5] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {editingCat ? 'Update Category' : 'Save Category'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">General Categories ({generalCategories.length})</h3>
            <div className="md:hidden space-y-2">
              {generalCategories.map((c) => (
                <div key={c.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{c.name} <span className="font-mono text-[10px] text-slate-500">{c.code || ''}</span></div>
                    {c.description && <div className="text-[11px] text-slate-500 truncate">{c.description}</div>}
                  </div>
                  <div className="inline-flex gap-1 shrink-0">
                    <button type="button" onClick={() => { setEditingCat(c); setCatName(c.name); setCatCode(c.code || ''); setCatDesc(c.description || ''); }} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { deleteCategory(c.id); showNotice('Category deleted.'); }} className="p-1.5 rounded-lg bg-slate-100 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Code</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generalCategories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">{c.name}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{c.code || '—'}</td>
                    <td className="py-2 px-3 text-slate-500">{c.description || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCat(c);
                            setCatName(c.name);
                            setCatCode(c.code || '');
                            setCatDesc(c.description || '');
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteCategory(c.id);
                            showNotice('Category deleted.');
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BRAND MANAGEMENT */}
      {subTab === 'brands' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={handleSaveBrand} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 h-fit">
            <h2 className="text-sm font-bold text-slate-900">
              {editingBrand ? 'Edit Brand' : 'Add Brand'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name *</label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Unilever / ACI / PRAN"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={brandDesc}
                onChange={(e) => setBrandDesc(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              {editingBrand && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBrand(null);
                    setBrandName('');
                    setBrandDesc('');
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2 bg-[#5b46b5] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {editingBrand ? 'Update Brand' : 'Save Brand'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Brands ({brands.length})</h3>
            <div className="md:hidden space-y-2">
              {brands.map((b) => (
                <div key={b.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{b.name}</div>
                    {b.description && <div className="text-[11px] text-slate-500 truncate">{b.description}</div>}
                  </div>
                  <div className="inline-flex gap-1 shrink-0">
                    <button type="button" onClick={() => { setEditingBrand(b); setBrandName(b.name); setBrandDesc(b.description || ''); }} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { deleteBrand(b.id); showNotice('Brand removed.'); }} className="p-1.5 rounded-lg bg-slate-100 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Brand Name</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">{b.name}</td>
                    <td className="py-2 px-3 text-slate-500">{b.description || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBrand(b);
                            setBrandName(b.name);
                            setBrandDesc(b.description || '');
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteBrand(b.id);
                            showNotice('Brand removed.');
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: UNIT MANAGEMENT */}
      {subTab === 'units' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={handleSaveUnit} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 h-fit">
            <h2 className="text-sm font-bold text-slate-900">
              {editingUnit ? 'Edit Unit' : 'Add Measurement Unit'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Name *</label>
              <input
                type="text"
                required
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="e.g. Kilogram / Piece / Box"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Short Symbol *</label>
              <input
                type="text"
                required
                value={unitShort}
                onChange={(e) => setUnitShort(e.target.value)}
                placeholder="e.g. kg / pcs / box"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
            <label className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer">
              <span className="font-semibold text-slate-700">Allow Decimal Quantity (e.g. 0.5 kg)</span>
              <input
                type="checkbox"
                checked={unitDecimal}
                onChange={(e) => setUnitDecimal(e.target.checked)}
                className="w-4 h-4 accent-[#5b46b5]"
              />
            </label>
            <div className="flex gap-2">
              {editingUnit && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingUnit(null);
                    setUnitName('');
                    setUnitShort('');
                    setUnitDecimal(false);
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2 bg-[#5b46b5] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {editingUnit ? 'Update Unit' : 'Save Unit'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Units ({units.length})</h3>
            <div className="md:hidden space-y-2">
              {units.map((u) => (
                <div key={u.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{u.name} <span className="font-mono text-indigo-600">({u.short_name})</span></div>
                    <div className="text-[11px] text-slate-500">Decimal: {u.is_decimal_allowed ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="inline-flex gap-1 shrink-0">
                    <button type="button" onClick={() => { setEditingUnit(u); setUnitName(u.name); setUnitShort(u.short_name); setUnitDecimal(Boolean(u.is_decimal_allowed)); }} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { deleteUnit(u.id); showNotice('Unit deleted.'); }} className="p-1.5 rounded-lg bg-slate-100 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Unit Name</th>
                  <th className="py-2 px-3">Short Name</th>
                  <th className="py-2 px-3">Decimal Allowed</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">{u.name}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{u.short_name}</td>
                    <td className="py-2 px-3 text-slate-600">{u.is_decimal_allowed ? 'Yes' : 'No'}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUnit(u);
                            setUnitName(u.name);
                            setUnitShort(u.short_name);
                            setUnitDecimal(Boolean(u.is_decimal_allowed));
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteUnit(u.id);
                            showNotice('Unit deleted.');
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PRODUCT STOCK */}
      {subTab === 'stock' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">General Product Stock</h2>
          <div className="md:hidden space-y-2">
            {flatVariants.map(({ product, variant }) => (
              <div key={variant.id} className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800">{product.name} ({variant.variant_name})</div>
                    <div className="text-[11px] text-slate-500">{product.brand_name || '—'} · Min: {variant.min_stock_level}</div>
                  </div>
                  <span className={`font-mono font-bold ${variant.stock_quantity <= variant.min_stock_level ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {formatStockBreakdown(variant.stock_quantity, variant)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="text-[11px] font-mono text-slate-600">
                    Cost: {store.currency_symbol}{(variant.stock_quantity * variant.purchase_price).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStockEditTarget({ product, variant, newStock: String(variant.stock_quantity), reason: 'General product stock audit' })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-indigo-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Adjust</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Product</th>
                  <th className="py-2 px-3">Brand</th>
                  <th className="py-2 px-3 text-right">Stock</th>
                  <th className="py-2 px-3 text-right">Min Alert</th>
                  <th className="py-2 px-3 text-right">Cost Valuation</th>
                  <th className="py-2 px-3 text-right">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flatVariants.map(({ product, variant }) => (
                  <tr key={variant.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">
                      {product.name} <span className="text-slate-400 font-normal">({variant.variant_name})</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{product.brand_name || '—'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                      <span className={variant.stock_quantity <= variant.min_stock_level ? 'text-rose-600' : 'text-emerald-700'}>
                        {formatStockBreakdown(variant.stock_quantity, variant)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">{variant.min_stock_level}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">
                      {store.currency_symbol}
                      {(variant.stock_quantity * variant.purchase_price).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setStockEditTarget({
                            product,
                            variant,
                            newStock: String(variant.stock_quantity),
                            reason: 'General product stock audit',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: PRODUCT BARCODE */}
      {subTab === 'barcode' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 no-print">
            <div className="flex flex-wrap items-end gap-3 flex-1">
              <div className="min-w-[260px] flex-1 max-w-md">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product Variant</label>
                <select
                  value={selectedBarcodeItem?.variant.id || ''}
                  onChange={(e) => setSelectedBarcodeVariantId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  {flatVariants.map(({ product, variant }) => (
                    <option key={variant.id} value={variant.id}>
                      {product.name} ({variant.variant_name}) - {variant.barcode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Labels Qty</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={barcodeLabelQty}
                  onChange={(e) => setBarcodeLabelQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!selectedBarcodeItem}
              className="px-4 py-2 bg-[#5b46b5] hover:bg-[#4b389b] disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Barcode Sheet</span>
            </button>
          </div>

          {selectedBarcodeItem ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {Array.from({ length: barcodeLabelQty }).map((_, idx) => (
                <div
                  key={idx}
                  className="border border-dashed border-slate-300 rounded-xl p-2.5 text-center bg-white"
                >
                  {store.barcode_show_store_name !== false && (
                    <div className="text-[9px] font-bold text-slate-500 truncate">{store.store_name}</div>
                  )}
                  <div className="text-[11px] font-extrabold text-slate-900 truncate">
                    {selectedBarcodeItem.product.name}
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">
                    {selectedBarcodeItem.variant.variant_name}
                  </div>
                  {renderBarcodeSvg(selectedBarcodeItem.variant.barcode)}
                  <div className="text-[10px] font-mono font-bold text-slate-700">
                    {selectedBarcodeItem.variant.barcode}
                  </div>
                  {store.barcode_show_price !== false && (
                    <div className="text-[11px] font-extrabold text-[#ec1f73] mt-0.5">
                      {store.currency_symbol}
                      {selectedBarcodeItem.variant.selling_price}
                      {store.barcode_show_mrp && selectedBarcodeItem.variant.mrp ? (
                        <span className="text-[9px] text-slate-400 font-normal ml-1">
                          (MRP {store.currency_symbol}{selectedBarcodeItem.variant.mrp})
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">Add a general product first to print barcodes.</div>
          )}
        </div>
      )}

      {/* ADD / EDIT GENERAL PRODUCT MODAL (Multi-Variant, Packaging Conversion & Stock/Supplier) */}
      {showProdModal && (() => {
        const activeDraft = variantDrafts[activeVariantIdx] || variantDrafts[0];
        const cFactor = activeDraft ? Math.max(1, parseFloat(activeDraft.carton_factor) || 24) : 24;
        const bFactor = activeDraft ? Math.max(1, parseFloat(activeDraft.box_factor) || 12) : 12;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Royal Azure Blue General Product Header matching reference image */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-[#0b6ff2] via-[#1b8cff] to-[#34a4ff] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold">
                      {editingProd ? `Edit Product — ${editingProd.name}` : 'Add Product'}
                    </h3>
                    <p className="text-[11px] text-blue-100">
                      Add general product with variants, packaging conversion &amp; base-unit stock tracking
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="hidden sm:flex items-center gap-2 text-xs font-bold bg-white/15 px-3 py-1 rounded-full cursor-pointer">
                    <span>{prodActive ? 'ON' : 'OFF'}</span>
                    <input
                      type="checkbox"
                      checked={prodActive}
                      onChange={(e) => setProdActive(e.target.checked)}
                      className="w-4 h-4 accent-white"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowProdModal(false)}
                    className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Section Tabs */}
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
                {[
                  { id: 'basic', label: 'Basic Information & Variants' },
                  { id: 'packaging', label: 'Packaging & Pricing' },
                  { id: 'stock', label: 'Stock & Supplier' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalSectionTab(tab.id as typeof modalSectionTab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      modalSectionTab === tab.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {formError && (
                <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2 shrink-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={(e) => handleSaveProduct(e, false)} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* SECTION 1: BASIC INFORMATION & VARIANTS */}
                {modalSectionTab === 'basic' && (
                  <>
                    <div className="space-y-3">
                      <h4 className="text-sm font-extrabold text-blue-800 border-b border-slate-100 pb-1.5">
                        1. Basic Information
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5">
                        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                            <input
                              type="text"
                              required
                              value={prodName}
                              onChange={(e) => setProdName(e.target.value)}
                              placeholder="e.g. Biscuit / Cooking Oil"
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">SKU / Product Code</label>
                            <input
                              type="text"
                              value={prodCode}
                              onChange={(e) => setProdCode(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                            <select
                              value={prodCategory}
                              onChange={(e) => setProdCategory(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            >
                              {generalCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Unit Type (Default Base)</label>
                            <select
                              value={prodUnit}
                              onChange={(e) => {
                                const nextUnit = e.target.value;
                                setProdUnit(nextUnit);
                                setVariantDrafts((prev) =>
                                  prev.map((d) => ({ ...d, base_unit: nextUnit }))
                                );
                              }}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            >
                              {['Packet', 'Piece', 'Bottle', 'Pack', 'Kg', 'Gram', 'Liter', 'Milliliter', 'Meter'].map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                              {units
                                .filter(
                                  (u) =>
                                    !['Packet', 'Piece', 'Bottle', 'Pack', 'Kg', 'Gram', 'Liter', 'Milliliter', 'Meter'].includes(
                                      u.name
                                    )
                                )
                                .map((u) => (
                                  <option key={u.id} value={u.name}>
                                    {u.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                            <select
                              value={prodBrandId}
                              onChange={(e) => {
                                const bId = e.target.value;
                                setProdBrandId(bId);
                                const b = brands.find((x) => x.id === bId);
                                if (b) setProdBrandName(b.name);
                              }}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            >
                              <option value="">Select Brand (Optional)</option>
                              {brands.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Custom Brand Name</label>
                            <input
                              type="text"
                              value={prodBrandName}
                              onChange={(e) => setProdBrandName(e.target.value)}
                              placeholder="e.g. Parle / Unilever"
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-slate-700 mb-1">Description</label>
                            <textarea
                              rows={2}
                              value={prodDesc}
                              onChange={(e) => setProdDesc(e.target.value)}
                              placeholder="Product details..."
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>
                        </div>

                        {/* Image Box */}
                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center justify-between gap-2.5">
                          <div className="w-full h-28 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                            {prodImage ? (
                              <img src={prodImage} alt="Product" className="w-full h-full object-contain" />
                            ) : (
                              <div className="text-center text-slate-400">
                                <Package className="w-7 h-7 mx-auto mb-1 opacity-40" />
                                <span className="text-[10px]">Product Photo</span>
                              </div>
                            )}
                          </div>
                          <input
                            type="text"
                            value={prodImage}
                            onChange={(e) => setProdImage(e.target.value)}
                            placeholder="Image URL..."
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                          />
                          <label className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center justify-center gap-1 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Change Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => setProdImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* PRODUCT VARIANTS (e.g. 100ml, 200ml, 500ml) */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-extrabold text-blue-800">
                            Product Variants ({variantDrafts.length})
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Add multiple pack sizes or variants (e.g. 100ml, 200ml, 500ml), each with its own SKU, barcode, conversion &amp; pricing.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextIdx = variantDrafts.length;
                            setVariantDrafts([...variantDrafts, createEmptyGenVariantDraft(nextIdx, prodUnit)]);
                            setActiveVariantIdx(nextIdx);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Another Variant</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-2.5">Variant / Size</th>
                              <th className="py-2 px-2.5">SKU</th>
                              <th className="py-2 px-2.5">Barcode</th>
                              <th className="py-2 px-2.5">Base Unit</th>
                              <th className="py-2 px-2.5 text-center">Pack &amp; Price</th>
                              <th className="py-2 px-2.5 text-right">Del</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {variantDrafts.map((vd, idx) => (
                              <tr key={vd.id} className={idx === activeVariantIdx ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={vd.variant_name}
                                    onChange={(e) => updateGenVariantDraft(idx, { variant_name: e.target.value })}
                                    placeholder="e.g. 100ml / 200ml / Standard"
                                    className="w-full min-w-[140px] border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={vd.sku}
                                    onChange={(e) => updateGenVariantDraft(idx, { sku: e.target.value })}
                                    className="w-full min-w-[95px] border border-slate-300 rounded-lg px-2 py-1.5 font-mono bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={vd.barcode}
                                    onChange={(e) => updateGenVariantDraft(idx, { barcode: e.target.value })}
                                    className="w-full min-w-[120px] border border-slate-300 rounded-lg px-2 py-1.5 font-mono bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={vd.base_unit}
                                    onChange={(e) => updateGenVariantDraft(idx, { base_unit: e.target.value })}
                                    className="w-full min-w-[95px] border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                                  >
                                    {['Packet', 'Piece', 'Bottle', 'Pack', 'Kg', 'Gram', 'Liter', 'Milliliter', 'Meter'].map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveVariantIdx(idx);
                                      setModalSectionTab('packaging');
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                                      idx === activeVariantIdx
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 hover:bg-blue-100 text-slate-700'
                                    }`}
                                  >
                                    Configure →
                                  </button>
                                </td>
                                <td className="p-2 text-right">
                                  <button
                                    type="button"
                                    disabled={variantDrafts.length <= 1}
                                    onClick={() => {
                                      const next = variantDrafts.filter((_, i) => i !== idx);
                                      setVariantDrafts(next);
                                      setActiveVariantIdx((prev) => Math.min(prev, Math.max(0, next.length - 1)));
                                    }}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* SECTION 2 & 3: PACKAGING SETUP & UNIT-WISE PRICING */}
                {modalSectionTab === 'packaging' && activeDraft && (
                  <div className="space-y-5">
                    {variantDrafts.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2">
                        <span className="text-[11px] font-bold text-slate-500 px-2">Active Variant:</span>
                        {variantDrafts.map((vd, idx) => (
                          <button
                            key={vd.id}
                            type="button"
                            onClick={() => setActiveVariantIdx(idx)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              idx === activeVariantIdx
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {vd.variant_name || `Variant #${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="text-sm font-extrabold text-blue-800 border-b border-slate-100 pb-1.5">
                        2. Packaging Setup (Conversion to Base Unit: {activeDraft.base_unit})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Base Unit (Stock Deducted Unit)</label>
                          <select
                            value={activeDraft.base_unit}
                            onChange={(e) => updateGenVariantDraft(activeVariantIdx, { base_unit: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-semibold"
                          >
                            {['Packet', 'Piece', 'Bottle', 'Pack', 'Kg', 'Gram', 'Liter', 'Milliliter', 'Meter'].map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Stock is always tracked &amp; deducted in {activeDraft.base_unit}.
                          </p>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-2.5 bg-white space-y-2">
                          <label className="flex items-center justify-between font-bold text-slate-800 cursor-pointer">
                            <span>Enable Carton Tier</span>
                            <input
                              type="checkbox"
                              checked={activeDraft.use_carton}
                              onChange={(e) => updateGenVariantDraft(activeVariantIdx, { use_carton: e.target.checked })}
                              className="w-4 h-4 accent-blue-600"
                            />
                          </label>
                          {activeDraft.use_carton && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-600 shrink-0">1 Carton =</span>
                              <input
                                type="number"
                                min="1"
                                step="any"
                                value={activeDraft.carton_factor}
                                onChange={(e) => updateGenVariantDraft(activeVariantIdx, { carton_factor: e.target.value })}
                                className="w-16 border border-slate-300 rounded-lg px-2 py-1 font-mono text-center"
                              />
                              <span className="text-[11px] font-semibold text-slate-600">{activeDraft.base_unit}</span>
                            </div>
                          )}
                        </div>

                        <div className="border border-slate-200 rounded-xl p-2.5 bg-white space-y-2">
                          <label className="flex items-center justify-between font-bold text-slate-800 cursor-pointer">
                            <span>Enable Box Tier</span>
                            <input
                              type="checkbox"
                              checked={activeDraft.use_box}
                              onChange={(e) => updateGenVariantDraft(activeVariantIdx, { use_box: e.target.checked })}
                              className="w-4 h-4 accent-blue-600"
                            />
                          </label>
                          {activeDraft.use_box && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-600 shrink-0">1 Box =</span>
                              <input
                                type="number"
                                min="1"
                                step="any"
                                value={activeDraft.box_factor}
                                onChange={(e) => updateGenVariantDraft(activeVariantIdx, { box_factor: e.target.value })}
                                className="w-16 border border-slate-300 rounded-lg px-2 py-1 font-mono text-center"
                              />
                              <span className="text-[11px] font-semibold text-slate-600">{activeDraft.base_unit}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3. UNIT-WISE PRICING */}
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-extrabold text-blue-800 border-b border-slate-100 pb-1.5">
                        3. Unit-wise Pricing ({store.currency_symbol})
                      </h4>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">Unit</th>
                              <th className="py-2 px-3">Qty in {activeDraft.base_unit}</th>
                              <th className="py-2 px-3">Purchase Price ({store.currency_symbol})</th>
                              <th className="py-2 px-3">Sale Price ({store.currency_symbol})</th>
                              <th className="py-2 px-3">MRP ({store.currency_symbol})</th>
                              <th className="py-2 px-3">Pack Barcode (Optional)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 tabular-nums">
                            {activeDraft.use_carton && (
                              <tr>
                                <td className="p-2.5 font-bold text-slate-800">{activeDraft.carton_unit_name}</td>
                                <td className="p-2.5 font-mono text-slate-500">
                                  {cFactor} {activeDraft.base_unit}
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.carton_purchase_price}
                                    onChange={(e) => updateGenVariantDraft(activeVariantIdx, { carton_purchase_price: e.target.value })}
                                    placeholder="480.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.carton_sale_price}
                                    onChange={(e) => updateGenVariantDraft(activeVariantIdx, { carton_sale_price: e.target.value })}
                                    placeholder="600.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.carton_mrp}
                                    onChange={(e) => updateGenVariantDraft(activeVariantIdx, { carton_mrp: e.target.value })}
                                    placeholder="650.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={activeDraft.carton_barcode}
                                    onChange={(e) => updateGenVariantDraft(activeVariantIdx, { carton_barcode: e.target.value })}
                                    placeholder="Carton Barcode"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                              </tr>
                            )}

                            {activeDraft.use_box && (
                              <tr>
                                <td className="p-2.5 font-bold text-slate-800">{activeDraft.box_unit_name}</td>
                                <td className="p-2.5 font-mono text-slate-500">
                                  {bFactor} {activeDraft.base_unit}
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.box_purchase_price}
                                    onChange={(e) => updateGenVariantDraft(activeVariantIdx, { box_purchase_price: e.target.value })}
                                    placeholder="120.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.box_sale_price}
                                    onChange={(e) => updateGenVariantDraft(activeVariantIdx, { box_sale_price: e.target.value })}
                                    placeholder="150.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.box_mrp}
                                    onChange={(e) => updateGenVariantDraft(activeVariantIdx, { box_mrp: e.target.value })}
                                    placeholder="170.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={activeDraft.box_barcode}
                                    onChange={(e) => updateGenVariantDraft(activeVariantIdx, { box_barcode: e.target.value })}
                                    placeholder="Box Barcode"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                              </tr>
                            )}

                            <tr className="bg-blue-50/40">
                              <td className="p-2.5 font-extrabold text-blue-900">
                                {activeDraft.base_unit} (Base Unit) *
                              </td>
                              <td className="p-2.5 font-mono text-blue-700 font-bold">1 {activeDraft.base_unit}</td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={activeDraft.base_purchase_price}
                                  onChange={(e) => updateGenVariantDraft(activeVariantIdx, { base_purchase_price: e.target.value })}
                                  placeholder="20.00"
                                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={activeDraft.base_sale_price}
                                  onChange={(e) => updateGenVariantDraft(activeVariantIdx, { base_sale_price: e.target.value })}
                                  placeholder="25.00"
                                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={activeDraft.base_mrp}
                                  onChange={(e) => updateGenVariantDraft(activeVariantIdx, { base_mrp: e.target.value })}
                                  placeholder="30.00"
                                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                                />
                              </td>
                              <td className="p-2 font-mono text-[11px] text-slate-500">
                                {activeDraft.barcode || 'Main Barcode'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 4: STOCK & SUPPLIER INFORMATION */}
                {modalSectionTab === 'stock' && activeDraft && (
                  <div className="space-y-4">
                    {variantDrafts.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2">
                        <span className="text-[11px] font-bold text-slate-500 px-2">Active Variant:</span>
                        {variantDrafts.map((vd, idx) => (
                          <button
                            key={vd.id}
                            type="button"
                            onClick={() => setActiveVariantIdx(idx)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              idx === activeVariantIdx
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {vd.variant_name || `Variant #${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <h4 className="text-sm font-extrabold text-blue-800 border-b border-slate-100 pb-1.5">
                      4. Stock &amp; Supplier Information — {activeDraft.variant_name || 'Variant'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Opening Stock (in {activeDraft.base_unit})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={activeDraft.opening_stock}
                          onChange={(e) => updateGenVariantDraft(activeVariantIdx, { opening_stock: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Minimum Stock Alert ({activeDraft.base_unit})
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={activeDraft.min_stock_level}
                          onChange={(e) => updateGenVariantDraft(activeVariantIdx, { min_stock_level: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
                        <select
                          value={activeDraft.supplier_id}
                          onChange={(e) => updateGenVariantDraft(activeVariantIdx, { supplier_id: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2"
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
                        <label className="block font-semibold text-slate-700 mb-1">Rack / Shelf</label>
                        <input
                          type="text"
                          value={prodRack}
                          onChange={(e) => setProdRack(e.target.value)}
                          placeholder="e.g. B-01"
                          className="w-full border border-slate-300 rounded-xl px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Expiry Date (Optional)</label>
                        <input
                          type="date"
                          value={activeDraft.expiry_date}
                          onChange={(e) => updateGenVariantDraft(activeVariantIdx, { expiry_date: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Warranty (Optional)</label>
                        <select
                          value={activeDraft.warranty}
                          onChange={(e) => updateGenVariantDraft(activeVariantIdx, { warranty: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2"
                        >
                          <option value="">No Warranty</option>
                          <option value="7 Days">7 Days</option>
                          <option value="1 Month">1 Month</option>
                          <option value="3 Months">3 Months</option>
                          <option value="6 Months">6 Months</option>
                          <option value="1 Year">1 Year</option>
                          <option value="2 Years">2 Years</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Discount %</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={activeDraft.discount_percentage}
                          onChange={(e) => updateGenVariantDraft(activeVariantIdx, { discount_percentage: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                        />
                      </div>

                      <div className="flex items-end">
                        <label className="w-full flex items-center justify-between border border-slate-300 rounded-xl px-3 py-2 cursor-pointer">
                          <span className="font-semibold text-slate-700">Status (Active)</span>
                          <input
                            type="checkbox"
                            checked={prodActive}
                            onChange={(e) => setProdActive(e.target.checked)}
                            className="w-4 h-4 accent-emerald-600"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 sticky bottom-0 bg-white">
                  <div className="flex items-center gap-2">
                    {modalSectionTab !== 'basic' && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalSectionTab(modalSectionTab === 'stock' ? 'packaging' : 'basic')
                        }
                        className="px-3.5 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        ← Back
                      </button>
                    )}
                    {modalSectionTab !== 'stock' && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalSectionTab(modalSectionTab === 'basic' ? 'packaging' : 'stock')
                        }
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
                      >
                        Next Step →
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl font-bold cursor-pointer"
                    >
                      {editingProd ? 'Update Product' : 'Save Product'}
                    </button>
                    {!editingProd && (
                      <button
                        type="button"
                        onClick={(e) => handleSaveProduct(e, true)}
                        className="px-4 py-2 bg-[#0f6ae6] hover:bg-[#0c56bd] text-white rounded-xl font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save &amp; Add Another</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowProdModal(false)}
                      className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-xl font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* QUICK STOCK ADJUST MODAL */}
      {stockEditTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Adjust Stock — {stockEditTarget.product.name}
              </h3>
              <button type="button" onClick={() => setStockEditTarget(null)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Stock Quantity</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={stockEditTarget.newStock}
                  onChange={(e) => setStockEditTarget({ ...stockEditTarget, newStock: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={stockEditTarget.reason}
                  onChange={(e) => setStockEditTarget({ ...stockEditTarget, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStockEditTarget(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const qty = parseFloat(stockEditTarget.newStock);
                  if (!Number.isFinite(qty) || qty < 0) return;
                  adjustStock(
                    stockEditTarget.variant.id,
                    qty,
                    stockEditTarget.reason || 'General product stock adjustment'
                  );
                  setStockEditTarget(null);
                  showNotice('Product stock adjusted.');
                }}
                className="px-4 py-2 bg-[#5b46b5] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Apply Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
