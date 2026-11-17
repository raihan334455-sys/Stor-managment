import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Pill,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  Tag,
  FlaskConical,
  Building2,
  Layers,
  CalendarClock,
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
  BatchLot,
  Category,
  GenericItem,
  PackagingUnitConfig,
  PharmaCompany,
  Product,
  ProductVariant,
} from '../../types';
import {
  formatStockBreakdown,
  getVariantBaseUnit,
  getVariantBatches,
  getVariantPackagingOptions,
} from '../../utils/packaging';
import {
  ALL_DOSAGE_FORMS,
  DOSAGE_FORM_GROUPS,
  MEDICINE_BASE_UNITS,
  getDefaultBaseUnitForDosage,
} from '../../utils/dosageForms';

type MedicineSubTab =
  | 'list'
  | 'categories'
  | 'generics'
  | 'companies'
  | 'batches'
  | 'expiry'
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

export const MedicineManagement: React.FC<{ initialTab?: MedicineSubTab }> = ({ initialTab }) => {
  const {
    store,
    updateStore,
    products,
    categories,
    generics,
    pharmaCompanies,
    units,
    suppliers,
    saveProduct,
    archiveProduct,
    adjustStock,
    saveCategory,
    deleteCategory,
    saveGeneric,
    deleteGeneric,
    savePharmaCompany,
    deletePharmaCompany,
    checkPermission,
  } = useApp();

  const isModuleEnabled = store.module_medicine_enabled !== false;
  const canManageSettings = checkPermission('settings_manage');
  const canEditProducts = checkPermission('product_manage');

  const [subTab, setSubTab] = useState<MedicineSubTab>(initialTab || 'list');
  useEffect(() => {
    if (initialTab) {
      setSubTab(initialTab);
    }
  }, [initialTab]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | '30' | '60' | '90'>('all');
  const [toast, setToast] = useState<string | null>(null);

  interface MedVariantDraft {
    id: string;
    variant_name: string;
    dosage_form: string;
    strength: string;
    sku: string;
    barcode: string;
    base_unit: string;
    use_box: boolean;
    box_unit_name: string;
    strips_per_box: string;
    box_barcode: string;
    use_strip: boolean;
    strip_unit_name: string;
    units_per_strip: string;
    strip_barcode: string;
    base_purchase_price: string;
    base_sale_price: string;
    base_mrp: string;
    strip_purchase_price: string;
    strip_sale_price: string;
    strip_mrp: string;
    box_purchase_price: string;
    box_sale_price: string;
    box_mrp: string;
    batch_number: string;
    mfg_date: string;
    expiry_date: string;
    opening_stock: string;
    min_stock_level: string;
    supplier_id: string;
    discount_percentage: string;
    active: boolean;
    existing_batches?: BatchLot[];
  }

  // Add/Edit Medicine Modal
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Product | null>(null);
  const [modalSectionTab, setModalSectionTab] = useState<'basic' | 'packaging' | 'batch'>('basic');
  const [formError, setFormError] = useState('');
  const [medName, setMedName] = useState('');
  const [medGeneric, setMedGeneric] = useState('');
  const [medBrand, setMedBrand] = useState('');
  const [medCompany, setMedCompany] = useState('');
  const [medCategory, setMedCategory] = useState('cat_medicine');
  const [medType, setMedType] = useState<string>('Tablet');
  const [medRack, setMedRack] = useState('');
  const [medImage, setMedImage] = useState('');
  const [medDesc, setMedDesc] = useState('');
  const [medActive, setMedActive] = useState(true);
  const [variantDrafts, setVariantDrafts] = useState<MedVariantDraft[]>([]);
  const [activeVariantIdx, setActiveVariantIdx] = useState<number>(0);

  // Category modal/inline state
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Generic CRUD state
  const [genName, setGenName] = useState('');
  const [genDesc, setGenDesc] = useState('');
  const [editingGen, setEditingGen] = useState<GenericItem | null>(null);

  // Company CRUD state
  const [compName, setCompName] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [editingComp, setEditingComp] = useState<PharmaCompany | null>(null);

  // Quick Batch Edit Modal
  const [batchEditTarget, setBatchEditTarget] = useState<{
    product: Product;
    variant: ProductVariant;
    batch: string;
    expiry: string;
  } | null>(null);

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
      module_medicine_enabled: !isModuleEnabled,
    });
    showNotice(
      !isModuleEnabled
        ? 'Medicine Management module turned ON.'
        : 'Medicine Management module turned OFF.'
    );
  };

  const medicineProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          !p.archived &&
          (p.is_medicine || p.category_id === 'cat_medicine' || Boolean(p.generic_name))
      ),
    [products]
  );

  const medicineCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.category_type === 'medicine' || c.id === 'cat_medicine' || !c.category_type
      ),
    [categories]
  );

  const filteredMedicines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicineProducts.filter((p) => {
      const isActive = p.active !== false;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.generic_name || '').toLowerCase().includes(q) ||
        (p.company_name || '').toLowerCase().includes(q) ||
        (p.rack_number || '').toLowerCase().includes(q) ||
        p.variants.some((v) => v.barcode.toLowerCase().includes(q) || (v.batch_number || '').toLowerCase().includes(q))
      );
    });
  }, [medicineProducts, search, statusFilter]);

  const flatMedicineVariants = useMemo(() => {
    return medicineProducts.flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })));
  }, [medicineProducts]);

  const expiryRows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return flatMedicineVariants
      .map(({ product, variant }) => {
        let daysLeft: number | null = null;
        if (variant.expiry_date) {
          const exp = new Date(variant.expiry_date);
          exp.setHours(0, 0, 0, 0);
          daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
        return { product, variant, daysLeft };
      })
      .filter((row) => {
        if (expiryFilter === 'all') return true;
        if (row.daysLeft === null) return false;
        if (expiryFilter === 'expired') return row.daysLeft <= 0;
        if (expiryFilter === '30') return row.daysLeft > 0 && row.daysLeft <= 30;
        if (expiryFilter === '60') return row.daysLeft > 0 && row.daysLeft <= 60;
        if (expiryFilter === '90') return row.daysLeft > 0 && row.daysLeft <= 90;
        return true;
      })
      .sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));
  }, [flatMedicineVariants, expiryFilter]);

  const createEmptyMedVariantDraft = (index = 0, dosageForm = 'Tablet'): MedVariantDraft => {
    const ts = Date.now().toString().slice(-5);
    const defaultBase = getDefaultBaseUnitForDosage(dosageForm);
    const isBlister = defaultBase === 'Tablet' || defaultBase === 'Capsule';
    const batchDef = `B${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}0${index + 1}`;
    return {
      id: `var_${Date.now()}_${index}`,
      variant_name: '',
      dosage_form: dosageForm,
      strength: '500mg',
      sku: `MED${ts}${index + 1}`,
      barcode: `${store.barcode_prefix || '894'}${(Date.now() + index).toString().slice(-8)}`,
      base_unit: defaultBase,
      use_box: isBlister,
      box_unit_name: 'Box',
      strips_per_box: isBlister ? '10' : '12',
      box_barcode: '',
      use_strip: isBlister,
      strip_unit_name: 'Strip',
      units_per_strip: '10',
      strip_barcode: '',
      base_purchase_price: '',
      base_sale_price: '',
      base_mrp: '',
      strip_purchase_price: '',
      strip_sale_price: '',
      strip_mrp: '',
      box_purchase_price: '',
      box_sale_price: '',
      box_mrp: '',
      batch_number: batchDef,
      mfg_date: new Date().toISOString().slice(0, 10),
      expiry_date: '',
      opening_stock: '0',
      min_stock_level: '10',
      supplier_id: suppliers[0]?.id || '',
      discount_percentage: '0',
      active: true,
    };
  };

  const openAddMedicine = () => {
    setEditingMed(null);
    setModalSectionTab('basic');
    setFormError('');
    setMedName('');
    setMedGeneric('');
    setMedBrand('');
    setMedCompany('');
    setMedCategory(medicineCategories[0]?.id || 'cat_medicine');
    setMedType('Tablet');
    setMedRack('');
    setMedImage('');
    setMedDesc('');
    setMedActive(true);
    setVariantDrafts([createEmptyMedVariantDraft(0, 'Tablet')]);
    setActiveVariantIdx(0);
    setShowMedModal(true);
  };

  const openEditMedicine = (p: Product) => {
    setEditingMed(p);
    setModalSectionTab('basic');
    setFormError('');
    setMedName(p.name);
    setMedGeneric(p.generic_name || '');
    setMedBrand(p.brand_name || '');
    setMedCompany(p.company_name || '');
    setMedCategory(p.category_id || 'cat_medicine');
    setMedType(p.medicine_type || 'Tablet');
    setMedRack(p.rack_number || '');
    setMedImage(p.image || '');
    setMedDesc(p.description || '');
    setMedActive(p.active !== false);

    const drafts: MedVariantDraft[] = p.variants.map((v, idx) => {
      const baseUnit = getVariantBaseUnit(v);
      const pkgs = getVariantPackagingOptions(v);
      const basePkg = pkgs.find((u) => u.conversion_factor === 1 || u.is_base);
      const nonBase = pkgs.filter((u) => u.conversion_factor > 1).sort((a, b) => a.conversion_factor - b.conversion_factor);
      const stripPkg = nonBase.find((u) => u.unit_name.toLowerCase().includes('strip')) || (nonBase.length > 1 ? nonBase[0] : undefined);
      const boxPkg = nonBase.find((u) => u.unit_name.toLowerCase().includes('box')) || (nonBase.length === 1 && !stripPkg ? nonBase[0] : nonBase[1]);

      const stripFactor = stripPkg ? stripPkg.conversion_factor : 10;
      const boxPerStrip = boxPkg ? Math.max(1, Math.round((boxPkg.conversion_factor / (stripPkg ? stripFactor : 1)) * 100) / 100) : 10;
      const batches = getVariantBatches(v);
      const primaryBatch = batches[0];

      return {
        id: v.id || `var_${Date.now()}_${idx}`,
        variant_name: v.variant_name || p.name,
        dosage_form: p.medicine_type || 'Tablet',
        strength: v.strength || p.strength || '',
        sku: v.sku || `MED-${idx + 1}`,
        barcode: v.barcode || '',
        base_unit: baseUnit,
        use_box: Boolean(boxPkg),
        box_unit_name: boxPkg?.unit_name || 'Box',
        strips_per_box: String(boxPerStrip),
        box_barcode: boxPkg?.barcode || '',
        use_strip: Boolean(stripPkg),
        strip_unit_name: stripPkg?.unit_name || 'Strip',
        units_per_strip: String(stripFactor),
        strip_barcode: stripPkg?.barcode || '',
        base_purchase_price: String(basePkg?.purchase_price ?? v.purchase_price ?? ''),
        base_sale_price: String(basePkg?.selling_price ?? v.selling_price ?? ''),
        base_mrp: String(basePkg?.mrp ?? v.mrp ?? v.selling_price ?? ''),
        strip_purchase_price: stripPkg ? String(stripPkg.purchase_price) : '',
        strip_sale_price: stripPkg ? String(stripPkg.selling_price) : '',
        strip_mrp: stripPkg ? String(stripPkg.mrp) : '',
        box_purchase_price: boxPkg ? String(boxPkg.purchase_price) : '',
        box_sale_price: boxPkg ? String(boxPkg.selling_price) : '',
        box_mrp: boxPkg ? String(boxPkg.mrp) : '',
        batch_number: primaryBatch?.batch_number || v.batch_number || '',
        mfg_date: primaryBatch?.mfg_date || v.mfg_date || '',
        expiry_date: primaryBatch?.expiry_date || v.expiry_date || '',
        opening_stock: String(v.stock_quantity ?? 0),
        min_stock_level: String(v.min_stock_level ?? 10),
        supplier_id: primaryBatch?.supplier_id || v.supplier_id || suppliers[0]?.id || '',
        discount_percentage: String(v.discount_percentage ?? 0),
        active: v.active !== false,
        existing_batches: batches.length > 0 ? batches : undefined,
      };
    });

    setVariantDrafts(drafts.length > 0 ? drafts : [createEmptyMedVariantDraft(0, p.medicine_type || 'Tablet')]);
    setActiveVariantIdx(0);
    setShowMedModal(true);
  };

  const updateVariantDraft = (idx: number, patch: Partial<MedVariantDraft>) => {
    setVariantDrafts((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        const next = { ...d, ...patch };
        // Auto-sync packaging pricing when base unit prices or conversion factors change & tier price wasn't explicitly set
        const uPerStrip = Math.max(1, parseFloat(next.units_per_strip) || 10);
        const sPerBox = Math.max(1, parseFloat(next.strips_per_box) || 10);
        const boxFactor = next.use_strip ? uPerStrip * sPerBox : sPerBox;

        if ('base_purchase_price' in patch || 'units_per_strip' in patch || 'strips_per_box' in patch) {
          const bp = parseFloat(next.base_purchase_price);
          if (Number.isFinite(bp) && bp > 0) {
            if (next.use_strip && (!d.strip_purchase_price || 'base_purchase_price' in patch || 'units_per_strip' in patch)) {
              next.strip_purchase_price = String(Math.round(bp * uPerStrip * 100) / 100);
            }
            if (next.use_box && (!d.box_purchase_price || 'base_purchase_price' in patch || 'strips_per_box' in patch || 'units_per_strip' in patch)) {
              next.box_purchase_price = String(Math.round(bp * boxFactor * 100) / 100);
            }
          }
        }
        if ('base_sale_price' in patch || 'units_per_strip' in patch || 'strips_per_box' in patch) {
          const bs = parseFloat(next.base_sale_price);
          if (Number.isFinite(bs) && bs > 0) {
            if (next.use_strip && (!d.strip_sale_price || 'base_sale_price' in patch || 'units_per_strip' in patch)) {
              next.strip_sale_price = String(Math.round(bs * uPerStrip * 100) / 100);
            }
            if (next.use_box && (!d.box_sale_price || 'base_sale_price' in patch || 'strips_per_box' in patch || 'units_per_strip' in patch)) {
              next.box_sale_price = String(Math.round(bs * boxFactor * 100) / 100);
            }
          }
        }
        if ('base_mrp' in patch || 'units_per_strip' in patch || 'strips_per_box' in patch) {
          const bm = parseFloat(next.base_mrp);
          if (Number.isFinite(bm) && bm > 0) {
            if (next.use_strip && (!d.strip_mrp || 'base_mrp' in patch || 'units_per_strip' in patch)) {
              next.strip_mrp = String(Math.round(bm * uPerStrip * 100) / 100);
            }
            if (next.use_box && (!d.box_mrp || 'base_mrp' in patch || 'strips_per_box' in patch || 'units_per_strip' in patch)) {
              next.box_mrp = String(Math.round(bm * boxFactor * 100) / 100);
            }
          }
        }
        return next;
      })
    );
  };

  const handleSaveMedicine = (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();
    setFormError('');
    if (!medName.trim()) {
      setFormError('Medicine Name is required.');
      setModalSectionTab('basic');
      return;
    }
    if (variantDrafts.length === 0) {
      setFormError('Add at least one medicine variant.');
      setModalSectionTab('basic');
      return;
    }

    const now = new Date().toISOString();
    const prodId = editingMed?.id || `med_${Date.now()}`;
    const builtVariants: ProductVariant[] = [];

    for (let idx = 0; idx < variantDrafts.length; idx++) {
      const d = variantDrafts[idx];
      const basePurchase = parseFloat(d.base_purchase_price) || 0;
      const baseSale = parseFloat(d.base_sale_price) || 0;
      const baseMrp = parseFloat(d.base_mrp) || baseSale;
      const stripSale = parseFloat(d.strip_sale_price) || 0;
      const boxSale = parseFloat(d.box_sale_price) || 0;

      if (baseSale <= 0 && stripSale <= 0 && boxSale <= 0) {
        setFormError(`Please enter a valid Sale Price for variant "${d.variant_name || `#${idx + 1}`}".`);
        setActiveVariantIdx(idx);
        setModalSectionTab('packaging');
        return;
      }

      const uPerStrip = Math.max(1, parseFloat(d.units_per_strip) || 10);
      const sPerBox = Math.max(1, parseFloat(d.strips_per_box) || 10);
      const boxFactor = d.use_strip ? uPerStrip * sPerBox : sPerBox;
      const resolvedBaseSale = baseSale > 0 ? baseSale : d.use_strip && stripSale > 0 ? Math.round((stripSale / uPerStrip) * 100) / 100 : Math.round((boxSale / boxFactor) * 100) / 100;
      const resolvedBasePurchase =
        basePurchase > 0
          ? basePurchase
          : d.use_strip && (parseFloat(d.strip_purchase_price) || 0) > 0
          ? Math.round(((parseFloat(d.strip_purchase_price) || 0) / uPerStrip) * 100) / 100
          : Math.round(((parseFloat(d.box_purchase_price) || 0) / boxFactor) * 100) / 100;
      const resolvedBaseMrp = baseMrp > 0 ? baseMrp : resolvedBaseSale;

      const packagingUnits: PackagingUnitConfig[] = [
        {
          id: `pkg_base_${d.id}`,
          unit_name: d.base_unit || 'Tablet',
          conversion_factor: 1,
          is_base: true,
          barcode: d.barcode.trim(),
          purchase_price: resolvedBasePurchase,
          selling_price: resolvedBaseSale,
          mrp: resolvedBaseMrp,
        },
      ];

      if (d.use_strip && d.strip_unit_name.trim()) {
        packagingUnits.push({
          id: `pkg_strip_${d.id}`,
          unit_name: d.strip_unit_name.trim(),
          conversion_factor: uPerStrip,
          is_base: false,
          barcode: d.strip_barcode.trim() || undefined,
          purchase_price: parseFloat(d.strip_purchase_price) || Math.round(resolvedBasePurchase * uPerStrip * 100) / 100,
          selling_price: stripSale || Math.round(resolvedBaseSale * uPerStrip * 100) / 100,
          mrp: parseFloat(d.strip_mrp) || Math.round(resolvedBaseMrp * uPerStrip * 100) / 100,
        });
      }

      if (d.use_box && d.box_unit_name.trim()) {
        packagingUnits.push({
          id: `pkg_box_${d.id}`,
          unit_name: d.box_unit_name.trim(),
          conversion_factor: boxFactor,
          is_base: false,
          barcode: d.box_barcode.trim() || undefined,
          purchase_price: parseFloat(d.box_purchase_price) || Math.round(resolvedBasePurchase * boxFactor * 100) / 100,
          selling_price: boxSale || Math.round(resolvedBaseSale * boxFactor * 100) / 100,
          mrp: parseFloat(d.box_mrp) || Math.round(resolvedBaseMrp * boxFactor * 100) / 100,
        });
      }

      const stockQty = Math.max(0, parseFloat(d.opening_stock) || 0);
      const minStock = Math.max(0, parseFloat(d.min_stock_level) || 10);
      const batchNo = d.batch_number.trim() || `B-${new Date().getFullYear().toString().slice(-2)}01`;

      let batches: BatchLot[] | undefined = d.existing_batches ? [...d.existing_batches] : undefined;
      if (batches && batches.length > 0) {
        batches[0] = {
          ...batches[0],
          batch_number: batchNo,
          mfg_date: d.mfg_date || undefined,
          expiry_date: d.expiry_date || undefined,
          supplier_id: d.supplier_id || undefined,
          purchase_price: resolvedBasePurchase,
          // Keep existing batch stock in sync if user edited total single-batch stock
          stock_quantity: batches.length === 1 ? stockQty : batches[0].stock_quantity,
        };
      } else {
        batches = [
          {
            id: `batch_${Date.now()}_${idx}`,
            batch_number: batchNo,
            mfg_date: d.mfg_date || undefined,
            expiry_date: d.expiry_date || undefined,
            stock_quantity: stockQty,
            purchase_price: resolvedBasePurchase,
            supplier_id: d.supplier_id || undefined,
            created_at: now,
          },
        ];
      }

      const existingV = editingMed?.variants.find((ev) => ev.id === d.id);
      const finalVarName =
        d.variant_name.trim() || `${medName.trim()} ${d.strength.trim()}`.trim() || d.base_unit;

      builtVariants.push({
        id: existingV?.id || d.id || `var_${Date.now()}_${idx}`,
        product_id: prodId,
        variant_name: finalVarName,
        sku: d.sku.trim() || `MED-${Date.now().toString().slice(-4)}-${idx + 1}`,
        barcode: d.barcode.trim() || `${store.barcode_prefix || '894'}${(Date.now() + idx).toString().slice(-8)}`,
        strength: d.strength.trim() || undefined,
        unit: d.base_unit || 'Tablet',
        base_unit: d.base_unit || 'Tablet',
        packaging_units: packagingUnits.sort((a, b) => b.conversion_factor - a.conversion_factor),
        purchase_price: resolvedBasePurchase,
        selling_price: resolvedBaseSale,
        mrp: resolvedBaseMrp,
        discount_percentage: parseFloat(d.discount_percentage) || 0,
        stock_quantity: stockQty,
        min_stock_level: minStock,
        supplier_id: d.supplier_id || undefined,
        batch_number: batchNo,
        mfg_date: d.mfg_date || undefined,
        expiry_date: d.expiry_date || undefined,
        batches,
        active: medActive && d.active,
        created_at: existingV?.created_at || now,
        updated_at: now,
        sync_status: 'pending',
        branch_id: store.branch_id,
        device_id: store.device_id,
      });
    }

    const payload: Product = {
      id: prodId,
      name: medName.trim(),
      generic_name: medGeneric.trim() || undefined,
      brand_name: medBrand.trim() || medCompany.trim() || undefined,
      company_name: medCompany.trim() || medBrand.trim() || undefined,
      medicine_type: medType,
      strength: builtVariants[0]?.strength || undefined,
      rack_number: medRack.trim() || undefined,
      is_medicine: true,
      active: medActive,
      description: medDesc.trim() || undefined,
      category_id: medCategory || 'cat_medicine',
      image: medImage.trim() || undefined,
      code: editingMed?.code || `MED-${Date.now().toString().slice(-4)}`,
      variants: builtVariants,
      archived: false,
      created_at: editingMed?.created_at || now,
      updated_at: now,
      sync_status: 'pending',
      branch_id: store.branch_id,
      device_id: store.device_id,
    };

    saveProduct(payload);
    showNotice(
      editingMed
        ? 'Medicine updated with variants & packaging.'
        : `Saved "${payload.name}" (${builtVariants.length} variant${builtVariants.length > 1 ? 's' : ''}).`
    );

    if (addAnother) {
      openAddMedicine();
    } else {
      setShowMedModal(false);
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    saveCategory({
      id: editingCat?.id || `cat_med_${Date.now()}`,
      name: catName.trim(),
      code: catCode.trim().toUpperCase() || catName.trim().slice(0, 3).toUpperCase(),
      description: catDesc.trim() || undefined,
      category_type: 'medicine',
      active: editingCat ? editingCat.active : true,
    });
    setCatName('');
    setCatCode('');
    setCatDesc('');
    setEditingCat(null);
    showNotice('Medicine category saved.');
  };

  const handleSaveGeneric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genName.trim()) return;
    saveGeneric({
      id: editingGen?.id || `gen_${Date.now()}`,
      name: genName.trim(),
      description: genDesc.trim() || undefined,
      active: editingGen ? editingGen.active : true,
      created_at: editingGen?.created_at || new Date().toISOString(),
    });
    setGenName('');
    setGenDesc('');
    setEditingGen(null);
    showNotice('Generic saved.');
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) return;
    savePharmaCompany({
      id: editingComp?.id || `pharma_${Date.now()}`,
      name: compName.trim(),
      phone: compPhone.trim() || undefined,
      email: compEmail.trim() || undefined,
      address: compAddress.trim() || undefined,
      active: editingComp ? editingComp.active : true,
      created_at: editingComp?.created_at || new Date().toISOString(),
    });
    setCompName('');
    setCompPhone('');
    setCompEmail('');
    setCompAddress('');
    setEditingComp(null);
    showNotice('Pharmaceutical company saved.');
  };

  const selectedBarcodeItem =
    flatMedicineVariants.find((i) => i.variant.id === selectedBarcodeVariantId) ||
    flatMedicineVariants[0] ||
    null;

  if (!isModuleEnabled) {
    return (
      <div className="p-6 max-w-2xl mx-auto my-12">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Pill className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Medicine Management is Turned OFF</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Pharmacy & Medicine modules (Medicines, Generics, Companies, Batch, Expiry & Barcodes) are currently disabled in Settings.
          </p>
          {canManageSettings && (
            <button
              type="button"
              onClick={toggleModule}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Power className="w-4 h-4" />
              <span>Turn Medicine Module ON</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-full w-full text-slate-800 space-y-5">
      {/* Header + Module ON/OFF Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#16a34a] to-[#10b981] text-white flex items-center justify-center shrink-0">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Medicine Management</h1>
            <p className="text-xs text-slate-500">
              Add Medicine, Generics, Pharma Companies, Batch & Expiry Tracking, Stock & Barcodes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManageSettings && (
            <button
              type="button"
              onClick={toggleModule}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              title="Toggle Medicine Module ON/OFF"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Module: ON</span>
            </button>
          )}
          {canEditProducts && (
            <button
              type="button"
              onClick={openAddMedicine}
              className="px-4 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medicine</span>
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

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 no-print">
        {[
          { id: 'list', label: 'Medicine List', icon: Pill },
          { id: 'categories', label: 'Medicine Categories', icon: Tag },
          { id: 'generics', label: 'Generic Management', icon: FlaskConical },
          { id: 'companies', label: 'Company Management', icon: Building2 },
          { id: 'batches', label: 'Batch Management', icon: Layers },
          { id: 'expiry', label: 'Expiry Management', icon: CalendarClock },
          { id: 'stock', label: 'Medicine Stock', icon: Boxes },
          { id: 'barcode', label: 'Medicine Barcode', icon: Barcode },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as MedicineSubTab)}
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

      {/* TAB 1: MEDICINE LIST */}
      {subTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicine name, generic, company, rack, batch, barcode..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#5b46b5]"
              />
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'active', 'inactive'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#ec1f73] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Medicine Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredMedicines.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No medicines found. Click &ldquo;Add Medicine&rdquo; to add one.
              </div>
            ) : (
              filteredMedicines.map((p) => {
                const v = p.variants[0];
                const totalStock = p.variants.reduce((s, item) => s + item.stock_quantity, 0);
                return (
                  <div key={p.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Pill className="w-4 h-4" />
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
                            {p.generic_name || '—'} · {p.company_name || p.brand_name || '—'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {p.medicine_type || 'Tablet'} · Rack: {p.rack_number || '—'} · {v?.barcode || p.code}
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
                        <span className="text-[10px] text-slate-400 block">Sale / MRP</span>
                        <span className="font-mono font-bold text-slate-900">{store.currency_symbol}{v?.selling_price ?? 0}</span>
                        <span className="text-[10px] text-slate-400 block">Buy {store.currency_symbol}{v?.purchase_price ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Batch / Exp</span>
                        <span className="font-mono text-slate-700 block truncate">{v?.batch_number || '—'}</span>
                        <span className="font-mono text-[10px] text-slate-500">{v?.expiry_date || '—'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Stock</span>
                        <span className={`font-mono font-bold ${totalStock <= (v?.min_stock_level || 10) ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {v ? formatStockBreakdown(totalStock, v) : totalStock}
                        </span>
                      </div>
                    </div>
                    {canEditProducts && (
                      <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
                        <button type="button" onClick={() => openEditMedicine(p)} className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer">
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
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Generic / Strength</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Type / Rack</th>
                  <th className="py-2.5 px-3">Batch / Expiry</th>
                  <th className="py-2.5 px-3 text-right">Buy / Sale / MRP</th>
                  <th className="py-2.5 px-3 text-right">Stock</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      No medicines found. Click &ldquo;Add Medicine&rdquo; to add one.
                    </td>
                  </tr>
                ) : (
                  filteredMedicines.map((p) => {
                    const v = p.variants[0];
                    const totalStock = p.variants.reduce((s, item) => s + item.stock_quantity, 0);
                    const pkgCount = v ? getVariantPackagingOptions(v).length : 1;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-purple-50 text-[#5b46b5] flex items-center justify-center shrink-0">
                                <Pill className="w-4 h-4" />
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
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-700">{p.generic_name || '—'}</div>
                          <div className="text-[10px] text-slate-500">
                            {p.variants.map((vr) => vr.strength || vr.variant_name).filter(Boolean).join(', ') || '—'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{p.company_name || p.brand_name || '—'}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-700">{p.medicine_type || 'Tablet'}</div>
                          <div className="text-[10px] text-slate-500">Rack: {p.rack_number || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] tabular-nums">
                          <div>{v?.batch_number || '—'}</div>
                          <div className="text-slate-500">{v?.expiry_date || '—'}</div>
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
                          <span className={totalStock <= (v?.min_stock_level || 10) ? 'text-rose-600' : 'text-emerald-700'}>
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
                                onClick={() => openEditMedicine(p)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                                title="Edit Medicine"
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
                                title="Archive Medicine"
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

      {/* TAB 2: MEDICINE CATEGORIES */}
      {subTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={handleSaveCategory} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 h-fit">
            <h2 className="text-sm font-bold text-slate-900">
              {editingCat ? 'Edit Medicine Category' : 'Add Medicine Category'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Antibiotics / Painkiller"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
              <input
                type="text"
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                placeholder="e.g. ABX"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Optional notes"
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
                className="flex-1 py-2 bg-[#5b46b5] hover:bg-[#4b389b] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {editingCat ? 'Update Category' : 'Save Category'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Medicine Categories ({medicineCategories.length})</h3>
            <div className="md:hidden space-y-2">
              {medicineCategories.map((c) => (
                <div key={c.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{c.name} <span className="font-mono text-[10px] text-slate-500">{c.code || ''}</span></div>
                    {c.description && <div className="text-[11px] text-slate-500 truncate">{c.description}</div>}
                  </div>
                  <div className="inline-flex gap-1 shrink-0">
                    <button type="button" onClick={() => { setEditingCat(c); setCatName(c.name); setCatCode(c.code || ''); setCatDesc(c.description || ''); }} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                    {c.id !== 'cat_medicine' && (
                      <button type="button" onClick={() => { deleteCategory(c.id); showNotice('Category deleted.'); }} className="p-1.5 rounded-lg bg-slate-100 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Code</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicineCategories.map((c) => (
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
                        {c.id !== 'cat_medicine' && (
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
                        )}
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

      {/* TAB 3: GENERIC MANAGEMENT */}
      {subTab === 'generics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={handleSaveGeneric} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 h-fit">
            <h2 className="text-sm font-bold text-slate-900">
              {editingGen ? 'Edit Generic Name' : 'Add Generic Name'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Generic Name *</label>
              <input
                type="text"
                required
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
                placeholder="e.g. Paracetamol + Caffeine"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Therapeutic Note / Indication</label>
              <textarea
                rows={3}
                value={genDesc}
                onChange={(e) => setGenDesc(e.target.value)}
                placeholder="e.g. Analgesic & Antipyretic"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              {editingGen && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGen(null);
                    setGenName('');
                    setGenDesc('');
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2 bg-[#5b46b5] hover:bg-[#4b389b] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {editingGen ? 'Update Generic' : 'Add Generic'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Generic Directory ({generics.length})</h3>
            <div className="md:hidden space-y-2">
              {generics.map((g) => (
                <div key={g.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{g.name}</div>
                    {g.description && <div className="text-[11px] text-slate-500 truncate">{g.description}</div>}
                  </div>
                  <div className="inline-flex gap-1 shrink-0">
                    <button type="button" onClick={() => { setEditingGen(g); setGenName(g.name); setGenDesc(g.description || ''); }} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { deleteGeneric(g.id); showNotice('Generic deleted.'); }} className="p-1.5 rounded-lg bg-slate-100 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Generic Name</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generics.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">{g.name}</td>
                    <td className="py-2 px-3 text-slate-500">{g.description || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGen(g);
                            setGenName(g.name);
                            setGenDesc(g.description || '');
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteGeneric(g.id);
                            showNotice('Generic deleted.');
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

      {/* TAB 4: COMPANY MANAGEMENT */}
      {subTab === 'companies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={handleSaveCompany} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 h-fit">
            <h2 className="text-sm font-bold text-slate-900">
              {editingComp ? 'Edit Pharma Company' : 'Add Pharma Company'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="e.g. Square Pharmaceuticals Ltd."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={compPhone}
                onChange={(e) => setCompPhone(e.target.value)}
                placeholder="017..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={compEmail}
                onChange={(e) => setCompEmail(e.target.value)}
                placeholder="info@company.com"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={compAddress}
                onChange={(e) => setCompAddress(e.target.value)}
                placeholder="Factory / Depot address"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              {editingComp && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingComp(null);
                    setCompName('');
                    setCompPhone('');
                    setCompEmail('');
                    setCompAddress('');
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2 bg-[#5b46b5] hover:bg-[#4b389b] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {editingComp ? 'Update Company' : 'Save Company'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Pharmaceutical Companies ({pharmaCompanies.length})</h3>
            <div className="md:hidden space-y-2">
              {pharmaCompanies.map((c) => (
                <div key={c.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{c.name}</div>
                    <div className="text-[11px] font-mono text-slate-600">{c.phone || '—'}</div>
                    {c.address && <div className="text-[11px] text-slate-500 truncate">{c.address}</div>}
                  </div>
                  <div className="inline-flex gap-1 shrink-0">
                    <button type="button" onClick={() => { setEditingComp(c); setCompName(c.name); setCompPhone(c.phone || ''); setCompEmail(c.email || ''); setCompAddress(c.address || ''); }} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { deletePharmaCompany(c.id); showNotice('Company removed.'); }} className="p-1.5 rounded-lg bg-slate-100 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Company</th>
                  <th className="py-2 px-3">Contact</th>
                  <th className="py-2 px-3">Address</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pharmaCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">{c.name}</td>
                    <td className="py-2 px-3 text-slate-600">
                      <div className="font-mono">{c.phone || '—'}</div>
                      <div className="text-[10px] text-slate-400">{c.email || ''}</div>
                    </td>
                    <td className="py-2 px-3 text-slate-500">{c.address || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingComp(c);
                            setCompName(c.name);
                            setCompPhone(c.phone || '');
                            setCompEmail(c.email || '');
                            setCompAddress(c.address || '');
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deletePharmaCompany(c.id);
                            showNotice('Company removed.');
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

      {/* TAB 5: BATCH MANAGEMENT */}
      {subTab === 'batches' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Batch Management ({flatMedicineVariants.length} variants)</h2>
          </div>
          <div className="md:hidden space-y-2">
            {flatMedicineVariants.map(({ product, variant }) => (
              <div key={variant.id} className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{product.name}</div>
                    <div className="text-[11px] text-slate-500">{variant.variant_name}</div>
                  </div>
                  <span className="font-mono font-bold text-indigo-600 shrink-0">{variant.batch_number || 'NO-BATCH'}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <div className="text-[11px] text-slate-600 font-mono">
                    Exp: {variant.expiry_date || 'Not Set'} · Stock: <strong>{formatStockBreakdown(variant.stock_quantity, variant)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBatchEditTarget({ product, variant, batch: variant.batch_number || '', expiry: variant.expiry_date || '' })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-indigo-700 font-semibold text-[11px] cursor-pointer"
                  >
                    Update
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Medicine</th>
                  <th className="py-2 px-3">Variant / Strength</th>
                  <th className="py-2 px-3">Batch Number</th>
                  <th className="py-2 px-3">Expiry Date</th>
                  <th className="py-2 px-3 text-right">Stock</th>
                  <th className="py-2 px-3 text-right">Edit Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flatMedicineVariants.map(({ product, variant }) => (
                  <tr key={variant.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">{product.name}</td>
                    <td className="py-2 px-3 text-slate-600">{variant.variant_name}</td>
                    <td className="py-2 px-3 font-mono font-bold text-[#5b46b5]">
                      {variant.batch_number || 'NO-BATCH'}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">{variant.expiry_date || 'Not Set'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                      {formatStockBreakdown(variant.stock_quantity, variant)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setBatchEditTarget({
                            product,
                            variant,
                            batch: variant.batch_number || '',
                            expiry: variant.expiry_date || '',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-700 font-semibold cursor-pointer"
                      >
                        Update Batch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: EXPIRY MANAGEMENT */}
      {subTab === 'expiry' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">Expiry Management</h2>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All Batches' },
                { id: 'expired', label: 'Expired' },
                { id: '30', label: '≤ 30 Days' },
                { id: '60', label: '≤ 60 Days' },
                { id: '90', label: '≤ 90 Days' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setExpiryFilter(f.id as typeof expiryFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    expiryFilter === f.id
                      ? 'bg-[#ec1f73] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:hidden space-y-2">
            {expiryRows.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No matching medicines in this expiry window.</div>
            ) : (
              expiryRows.map(({ product, variant, daysLeft }) => {
                const isExpired = daysLeft !== null && daysLeft <= 0;
                const isCritical = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
                return (
                  <div key={variant.id} className="border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-800">{product.name} ({variant.variant_name})</div>
                        <div className="text-[11px] text-slate-500">{product.company_name || '—'} · Batch: {variant.batch_number || '—'}</div>
                      </div>
                      {daysLeft === null ? (
                        <span className="text-slate-400 text-[10px]">No Date</span>
                      ) : isExpired ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] shrink-0">EXPIRED</span>
                      ) : isCritical ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] shrink-0">{daysLeft}d left</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] shrink-0">{daysLeft}d left</span>
                      )}
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-600 pt-1 border-t border-slate-100">
                      <span>Exp: {variant.expiry_date || 'Not Set'}</span>
                      <span className="font-bold text-slate-900">{variant.stock_quantity} {variant.unit}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Medicine</th>
                  <th className="py-2 px-3">Company</th>
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3">Expiry Date</th>
                  <th className="py-2 px-3">Days Left</th>
                  <th className="py-2 px-3 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiryRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No matching medicines in this expiry window.
                    </td>
                  </tr>
                ) : (
                  expiryRows.map(({ product, variant, daysLeft }) => {
                    const isExpired = daysLeft !== null && daysLeft <= 0;
                    const isCritical = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
                    return (
                      <tr key={variant.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {product.name} <span className="text-slate-400 font-normal">({variant.variant_name})</span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{product.company_name || '—'}</td>
                        <td className="py-2 px-3 font-mono">{variant.batch_number || '—'}</td>
                        <td className="py-2 px-3 font-mono">{variant.expiry_date || 'Not Set'}</td>
                        <td className="py-2 px-3">
                          {daysLeft === null ? (
                            <span className="text-slate-400">No Date</span>
                          ) : isExpired ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                              EXPIRED ({Math.abs(daysLeft)}d ago)
                            </span>
                          ) : isCritical ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                              {daysLeft} days left
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                              {daysLeft} days left
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {variant.stock_quantity} {variant.unit}
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

      {/* TAB 7: MEDICINE STOCK */}
      {subTab === 'stock' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Medicine Stock Levels</h2>
          <div className="md:hidden space-y-2">
            {flatMedicineVariants.map(({ product, variant }) => (
              <div key={variant.id} className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800">{product.name} ({variant.variant_name})</div>
                    <div className="text-[11px] text-slate-500">Rack: {product.rack_number || '—'} · Min: {variant.min_stock_level}</div>
                  </div>
                  <span className={`font-mono font-bold ${variant.stock_quantity <= variant.min_stock_level ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {formatStockBreakdown(variant.stock_quantity, variant)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="text-[11px] font-mono text-slate-600">
                    Value: {store.currency_symbol}{(variant.stock_quantity * variant.purchase_price).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStockEditTarget({ product, variant, newStock: String(variant.stock_quantity), reason: 'Medicine stock audit adjustment' })}
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
                  <th className="py-2 px-3">Medicine</th>
                  <th className="py-2 px-3">Rack</th>
                  <th className="py-2 px-3 text-right">Current Stock</th>
                  <th className="py-2 px-3 text-right">Min Alert</th>
                  <th className="py-2 px-3 text-right">Stock Value</th>
                  <th className="py-2 px-3 text-right">Quick Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flatMedicineVariants.map(({ product, variant }) => (
                  <tr key={variant.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">
                      {product.name} <span className="text-slate-400 font-normal">({variant.variant_name})</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{product.rack_number || '—'}</td>
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
                            reason: 'Medicine stock audit adjustment',
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

      {/* TAB 8: MEDICINE BARCODE */}
      {subTab === 'barcode' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 no-print">
            <div className="flex flex-wrap items-end gap-3 flex-1">
              <div className="min-w-[260px] flex-1 max-w-md">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Medicine Variant</label>
                <select
                  value={selectedBarcodeItem?.variant.id || ''}
                  onChange={(e) => setSelectedBarcodeVariantId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  {flatMedicineVariants.map(({ product, variant }) => (
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
            <div className="py-10 text-center text-xs text-slate-400">Add a medicine first to print barcode labels.</div>
          )}
        </div>
      )}

      {/* ADD / EDIT MEDICINE MODAL (Multi-Variant, Packaging Conversion & Batch Stock) */}
      {showMedModal && (() => {
        const activeDraft = variantDrafts[activeVariantIdx] || variantDrafts[0];
        const uPerStrip = activeDraft ? Math.max(1, parseFloat(activeDraft.units_per_strip) || 10) : 10;
        const sPerBox = activeDraft ? Math.max(1, parseFloat(activeDraft.strips_per_box) || 10) : 10;
        const boxTotalBase = activeDraft?.use_strip ? uPerStrip * sPerBox : sPerBox;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Mint-Emerald Pharmacy Header matching reference image */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-[#16a34a] via-[#10b981] to-[#34d399] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold">
                      {editingMed ? `Edit Medicine — ${editingMed.name}` : 'Add Medicine'}
                    </h3>
                    <p className="text-[11px] text-emerald-100">
                      Add new medicine with multiple variants, packaging conversion &amp; batch stock
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="hidden sm:flex items-center gap-2 text-xs font-bold bg-white/15 px-3 py-1 rounded-full cursor-pointer">
                    <span>{medActive ? 'ON' : 'OFF'}</span>
                    <input
                      type="checkbox"
                      checked={medActive}
                      onChange={(e) => setMedActive(e.target.checked)}
                      className="w-4 h-4 accent-white"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMedModal(false)}
                    className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Section Navigation Tabs */}
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
                {[
                  { id: 'basic', label: 'Basic Information & Variants' },
                  { id: 'packaging', label: 'Packaging & Pricing' },
                  { id: 'batch', label: 'Batch & Stock' },
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

              <form onSubmit={(e) => handleSaveMedicine(e, false)} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* SECTION 1 & 2: BASIC INFO + MEDICINE VARIANTS */}
                {modalSectionTab === 'basic' && (
                  <>
                    <div className="space-y-3">
                      <h4 className="text-sm font-extrabold text-blue-800 border-b border-slate-100 pb-1.5">
                        1. Basic Information
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5">
                        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                            <input
                              type="text"
                              required
                              value={medName}
                              onChange={(e) => setMedName(e.target.value)}
                              placeholder="e.g. Napa"
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Dosage Form</label>
                            <select
                              value={medType}
                              onChange={(e) => {
                                const nextType = e.target.value;
                                setMedType(nextType);
                                const nextBase = getDefaultBaseUnitForDosage(nextType);
                                setVariantDrafts((prev) =>
                                  prev.map((d) => ({
                                    ...d,
                                    dosage_form: nextType,
                                    base_unit: nextBase,
                                  }))
                                );
                              }}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                            >
                              {medType && !ALL_DOSAGE_FORMS.includes(medType) && (
                                <option value={medType}>{medType}</option>
                              )}
                              {DOSAGE_FORM_GROUPS.map((group) => (
                                <optgroup key={group.id} label={group.label}>
                                  {group.forms.map((form) => (
                                    <option key={`${group.id}_${form}`} value={form}>
                                      {form}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Generic Name</label>
                            <input
                              type="text"
                              list="med-generic-list"
                              value={medGeneric}
                              onChange={(e) => setMedGeneric(e.target.value)}
                              placeholder="e.g. Paracetamol"
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                            <datalist id="med-generic-list">
                              {generics.map((g) => (
                                <option key={g.id} value={g.name} />
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Category</label>
                            <select
                              value={medCategory}
                              onChange={(e) => setMedCategory(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            >
                              {medicineCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Brand / Company *</label>
                            <input
                              type="text"
                              list="med-company-list"
                              value={medCompany}
                              onChange={(e) => {
                                setMedCompany(e.target.value);
                                if (!medBrand) setMedBrand(e.target.value);
                              }}
                              placeholder="e.g. Square / Beximco"
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                            <datalist id="med-company-list">
                              {pharmaCompanies.map((c) => (
                                <option key={c.id} value={c.name} />
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Brand Name (Optional)</label>
                            <input
                              type="text"
                              value={medBrand}
                              onChange={(e) => setMedBrand(e.target.value)}
                              placeholder="Brand label"
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-slate-700 mb-1">Description</label>
                            <textarea
                              rows={2}
                              value={medDesc}
                              onChange={(e) => setMedDesc(e.target.value)}
                              placeholder="Pain reliever & fever reducer, storage notes..."
                              className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>
                        </div>

                        {/* Image preview & upload */}
                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center justify-between gap-2.5">
                          <div className="w-full h-28 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                            {medImage ? (
                              <img src={medImage} alt="Medicine" className="w-full h-full object-contain" />
                            ) : (
                              <div className="text-center text-slate-400">
                                <Pill className="w-7 h-7 mx-auto mb-1 opacity-40" />
                                <span className="text-[10px]">Medicine Photo</span>
                              </div>
                            )}
                          </div>
                          <input
                            type="text"
                            value={medImage}
                            onChange={(e) => setMedImage(e.target.value)}
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
                                reader.onloadend = () => setMedImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 2. MEDICINE VARIANTS */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-extrabold text-blue-800">
                            2. Medicine Variants ({variantDrafts.length})
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Add multiple strengths/forms under one medicine (e.g. Napa 500, Napa 665). Click a row to customize its Packaging &amp; Batch.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextIdx = variantDrafts.length;
                            setVariantDrafts([...variantDrafts, createEmptyMedVariantDraft(nextIdx, medType)]);
                            setActiveVariantIdx(nextIdx);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Another Variant</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-2.5">Variant Name</th>
                              <th className="py-2 px-2.5">Strength</th>
                              <th className="py-2 px-2.5">SKU</th>
                              <th className="py-2 px-2.5">Barcode</th>
                              <th className="py-2 px-2.5">Base Unit</th>
                              <th className="py-2 px-2.5 text-center">Pack / Batch</th>
                              <th className="py-2 px-2.5 text-right">Del</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {variantDrafts.map((vd, idx) => {
                              const isSelected = idx === activeVariantIdx;
                              return (
                                <tr
                                  key={vd.id}
                                  className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}
                                >
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={vd.variant_name}
                                      onChange={(e) => updateVariantDraft(idx, { variant_name: e.target.value })}
                                      placeholder={medName ? `${medName} ${vd.strength}` : 'e.g. Napa 500'}
                                      className="w-full min-w-[120px] border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={vd.strength}
                                      onChange={(e) => updateVariantDraft(idx, { strength: e.target.value })}
                                      placeholder="500 mg"
                                      className="w-full min-w-[80px] border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={vd.sku}
                                      onChange={(e) => updateVariantDraft(idx, { sku: e.target.value })}
                                      className="w-full min-w-[90px] border border-slate-300 rounded-lg px-2 py-1.5 font-mono bg-white"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={vd.barcode}
                                      onChange={(e) => updateVariantDraft(idx, { barcode: e.target.value })}
                                      className="w-full min-w-[115px] border border-slate-300 rounded-lg px-2 py-1.5 font-mono bg-white"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <select
                                      value={vd.base_unit}
                                      onChange={(e) => updateVariantDraft(idx, { base_unit: e.target.value })}
                                      className="w-full min-w-[90px] border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                                    >
                                      {MEDICINE_BASE_UNITS.map((u) => (
                                        <option key={u} value={u}>
                                          {u}
                                        </option>
                                      ))}
                                      {units
                                        .filter((u) => !MEDICINE_BASE_UNITS.includes(u.name))
                                        .map((u) => (
                                          <option key={u.id} value={u.name}>
                                            {u.name}
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
                                        isSelected
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
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* SECTION 3 & 4: PACKAGING CONFIGURATION & UNIT-WISE PRICING */}
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
                            {vd.variant_name || `${medName || 'Variant'} ${vd.strength || `#${idx + 1}`}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="text-sm font-extrabold text-blue-800 border-b border-slate-100 pb-1.5">
                        3. Packaging Configuration (Conversion to Base Unit: {activeDraft.base_unit})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Base Unit (Stock Unit)</label>
                          <select
                            value={activeDraft.base_unit}
                            onChange={(e) => updateVariantDraft(activeVariantIdx, { base_unit: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-semibold"
                          >
                            {Array.from(
                              new Set([
                                ...MEDICINE_BASE_UNITS,
                                ...units.map((u) => u.name),
                              ])
                            ).map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-slate-500 mt-1">Stock is always stored &amp; deducted in {activeDraft.base_unit}.</p>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-2.5 bg-white space-y-2">
                          <label className="flex items-center justify-between font-bold text-slate-800 cursor-pointer">
                            <span>Enable Strip Tier</span>
                            <input
                              type="checkbox"
                              checked={activeDraft.use_strip}
                              onChange={(e) => updateVariantDraft(activeVariantIdx, { use_strip: e.target.checked })}
                              className="w-4 h-4 accent-blue-600"
                            />
                          </label>
                          {activeDraft.use_strip && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-600 shrink-0">1 Strip =</span>
                              <input
                                type="number"
                                min="1"
                                step="any"
                                value={activeDraft.units_per_strip}
                                onChange={(e) => updateVariantDraft(activeVariantIdx, { units_per_strip: e.target.value })}
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
                              onChange={(e) => updateVariantDraft(activeVariantIdx, { use_box: e.target.checked })}
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
                                value={activeDraft.strips_per_box}
                                onChange={(e) => updateVariantDraft(activeVariantIdx, { strips_per_box: e.target.value })}
                                className="w-16 border border-slate-300 rounded-lg px-2 py-1 font-mono text-center"
                              />
                              <span className="text-[11px] font-semibold text-slate-600">
                                {activeDraft.use_strip ? 'Strip' : activeDraft.base_unit}
                              </span>
                              <span className="text-[10px] font-mono text-blue-700 ml-auto">
                                ({boxTotalBase} {activeDraft.base_unit})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4. UNIT-WISE PRICING */}
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-extrabold text-blue-800 border-b border-slate-100 pb-1.5">
                        4. Unit-wise Pricing ({store.currency_symbol})
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
                            {activeDraft.use_box && (
                              <tr>
                                <td className="p-2.5 font-bold text-slate-800">Box</td>
                                <td className="p-2.5 font-mono text-slate-500">
                                  {boxTotalBase} {activeDraft.base_unit}
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.box_purchase_price}
                                    onChange={(e) => updateVariantDraft(activeVariantIdx, { box_purchase_price: e.target.value })}
                                    placeholder="800.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.box_sale_price}
                                    onChange={(e) => updateVariantDraft(activeVariantIdx, { box_sale_price: e.target.value })}
                                    placeholder="900.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.box_mrp}
                                    onChange={(e) => updateVariantDraft(activeVariantIdx, { box_mrp: e.target.value })}
                                    placeholder="1000.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={activeDraft.box_barcode}
                                    onChange={(e) => updateVariantDraft(activeVariantIdx, { box_barcode: e.target.value })}
                                    placeholder="Optional Box Barcode"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                              </tr>
                            )}

                            {activeDraft.use_strip && (
                              <tr>
                                <td className="p-2.5 font-bold text-slate-800">Strip</td>
                                <td className="p-2.5 font-mono text-slate-500">
                                  {uPerStrip} {activeDraft.base_unit}
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.strip_purchase_price}
                                    onChange={(e) => updateVariantDraft(activeVariantIdx, { strip_purchase_price: e.target.value })}
                                    placeholder="80.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.strip_sale_price}
                                    onChange={(e) => updateVariantDraft(activeVariantIdx, { strip_sale_price: e.target.value })}
                                    placeholder="90.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={activeDraft.strip_mrp}
                                    onChange={(e) => updateVariantDraft(activeVariantIdx, { strip_mrp: e.target.value })}
                                    placeholder="100.00"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={activeDraft.strip_barcode}
                                    onChange={(e) => updateVariantDraft(activeVariantIdx, { strip_barcode: e.target.value })}
                                    placeholder="Optional Strip Barcode"
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                                  />
                                </td>
                              </tr>
                            )}

                            <tr className="bg-emerald-50/40">
                              <td className="p-2.5 font-extrabold text-emerald-800">
                                {activeDraft.base_unit} (Base Unit) *
                              </td>
                              <td className="p-2.5 font-mono text-emerald-700 font-bold">1 {activeDraft.base_unit}</td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={activeDraft.base_purchase_price}
                                  onChange={(e) => updateVariantDraft(activeVariantIdx, { base_purchase_price: e.target.value })}
                                  placeholder="8.00"
                                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={activeDraft.base_sale_price}
                                  onChange={(e) => updateVariantDraft(activeVariantIdx, { base_sale_price: e.target.value })}
                                  placeholder="9.00"
                                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={activeDraft.base_mrp}
                                  onChange={(e) => updateVariantDraft(activeVariantIdx, { base_mrp: e.target.value })}
                                  placeholder="10.00"
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

                {/* SECTION 5: BATCH & STOCK INFORMATION */}
                {modalSectionTab === 'batch' && activeDraft && (
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
                            {vd.variant_name || `${medName || 'Variant'} ${vd.strength || `#${idx + 1}`}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <h4 className="text-sm font-extrabold text-blue-800 border-b border-slate-100 pb-1.5">
                      5. Batch &amp; Stock Information — {activeDraft.variant_name || activeDraft.strength || 'Variant'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                        <input
                          type="text"
                          value={activeDraft.batch_number}
                          onChange={(e) => updateVariantDraft(activeVariantIdx, { batch_number: e.target.value })}
                          placeholder="e.g. B250401"
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Mfg. Date</label>
                        <input
                          type="date"
                          value={activeDraft.mfg_date}
                          onChange={(e) => updateVariantDraft(activeVariantIdx, { mfg_date: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                        <input
                          type="date"
                          value={activeDraft.expiry_date}
                          onChange={(e) => updateVariantDraft(activeVariantIdx, { expiry_date: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Opening Stock (in {activeDraft.base_unit})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={activeDraft.opening_stock}
                          onChange={(e) => updateVariantDraft(activeVariantIdx, { opening_stock: e.target.value })}
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
                          onChange={(e) => updateVariantDraft(activeVariantIdx, { min_stock_level: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Rack / Shelf</label>
                        <input
                          type="text"
                          value={medRack}
                          onChange={(e) => setMedRack(e.target.value)}
                          placeholder="e.g. A-01"
                          className="w-full border border-slate-300 rounded-xl px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
                        <select
                          value={activeDraft.supplier_id}
                          onChange={(e) => updateVariantDraft(activeVariantIdx, { supplier_id: e.target.value })}
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
                        <label className="block font-semibold text-slate-700 mb-1">Discount %</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={activeDraft.discount_percentage}
                          onChange={(e) => updateVariantDraft(activeVariantIdx, { discount_percentage: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                        />
                      </div>

                      <div className="flex items-end">
                        <label className="w-full flex items-center justify-between border border-slate-300 rounded-xl px-3 py-2 cursor-pointer">
                          <span className="font-semibold text-slate-700">Status (Active)</span>
                          <input
                            type="checkbox"
                            checked={medActive}
                            onChange={(e) => setMedActive(e.target.checked)}
                            className="w-4 h-4 accent-emerald-600"
                          />
                        </label>
                      </div>
                    </div>

                    {activeDraft.existing_batches && activeDraft.existing_batches.length > 1 && (
                      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                        <div className="text-xs font-bold text-slate-700">
                          Additional Batch Lots ({activeDraft.existing_batches.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeDraft.existing_batches.map((b) => (
                            <div key={b.id} className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between text-[11px] font-mono">
                              <div>
                                <div className="font-bold text-[#5b46b5]">{b.batch_number}</div>
                                <div className="text-slate-400">Exp: {b.expiry_date || '—'}</div>
                              </div>
                              <div className="font-bold text-slate-800">
                                {b.stock_quantity} {activeDraft.base_unit}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 sticky bottom-0 bg-white">
                  <div className="flex items-center gap-2">
                    {modalSectionTab !== 'basic' && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalSectionTab(modalSectionTab === 'batch' ? 'packaging' : 'basic')
                        }
                        className="px-3.5 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        ← Back
                      </button>
                    )}
                    {modalSectionTab !== 'batch' && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalSectionTab(modalSectionTab === 'basic' ? 'packaging' : 'batch')
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
                      {editingMed ? 'Update Medicine' : 'Save Medicine'}
                    </button>
                    {!editingMed && (
                      <button
                        type="button"
                        onClick={(e) => handleSaveMedicine(e, true)}
                        className="px-4 py-2 bg-[#0f6ae6] hover:bg-[#0c56bd] text-white rounded-xl font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save &amp; Add Another</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowMedModal(false)}
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

      {/* BATCH EDIT MODAL */}
      {batchEditTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Update Batch — {batchEditTarget.product.name}
              </h3>
              <button type="button" onClick={() => setBatchEditTarget(null)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batch Number</label>
                <input
                  type="text"
                  value={batchEditTarget.batch}
                  onChange={(e) => setBatchEditTarget({ ...batchEditTarget, batch: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={batchEditTarget.expiry}
                  onChange={(e) => setBatchEditTarget({ ...batchEditTarget, expiry: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBatchEditTarget(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleanBatch = batchEditTarget.batch.trim() || undefined;
                  const cleanExp = batchEditTarget.expiry || undefined;
                  const updatedProd: Product = {
                    ...batchEditTarget.product,
                    variants: batchEditTarget.product.variants.map((v) => {
                      if (v.id !== batchEditTarget.variant.id) return v;
                      const nextBatches = v.batches?.length
                        ? v.batches.map((b, bIdx) =>
                            bIdx === 0
                              ? { ...b, batch_number: cleanBatch || b.batch_number, expiry_date: cleanExp }
                              : b
                          )
                        : cleanBatch || cleanExp
                        ? [
                            {
                              id: `batch_${Date.now()}`,
                              batch_number: cleanBatch || 'BATCH-01',
                              expiry_date: cleanExp,
                              stock_quantity: v.stock_quantity,
                            },
                          ]
                        : undefined;
                      return {
                        ...v,
                        batch_number: cleanBatch,
                        expiry_date: cleanExp,
                        batches: nextBatches,
                        updated_at: new Date().toISOString(),
                      };
                    }),
                    updated_at: new Date().toISOString(),
                  };
                  saveProduct(updatedProd);
                  setBatchEditTarget(null);
                  showNotice('Batch & expiry updated.');
                }}
                className="px-4 py-2 bg-[#5b46b5] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Save Batch
              </button>
            </div>
          </div>
        </div>
      )}

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
                    stockEditTarget.reason || 'Medicine stock adjustment'
                  );
                  setStockEditTarget(null);
                  showNotice('Medicine stock adjusted.');
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
