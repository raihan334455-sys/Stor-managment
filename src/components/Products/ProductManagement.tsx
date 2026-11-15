import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  Archive,
  ChevronDown,
  ChevronUp,
  Tag,
  Printer,
  X,
  Layers,
  CopyPlus,
  Copy,
  Trash2,
  Sparkles,
  Upload,
  Download,
  Globe,
  Check,
  Image as ImageIcon,
  Loader2,
  QrCode,
  Pill,
  CheckCircle2,
  FileSpreadsheet,
  ClipboardPaste,
  AlertCircle,
} from 'lucide-react';
import {
  BatchLot,
  MedicineType,
  PackagingUnitConfig,
  Product,
  ProductVariant,
  UnitType,
} from '../../types';
import { QrBarcodeScannerModal } from '../Scanner/QrBarcodeScannerModal';
import {
  isCategoryEnabled,
  isGeneralProductModuleEnabled,
  isMedicineModuleEnabled,
  isMedicineProduct,
  isProductEnabled,
} from '../../utils/modules';
import {
  formatStockBreakdown,
  getVariantBaseUnit,
  getVariantPackagingOptions,
} from '../../utils/packaging';

interface UnifiedVariantDraft {
  id?: string;
  variant_name: string;
  sku: string;
  barcode: string;
  strength: string;
  base_unit: UnitType;
  // Base unit pricing (factor = 1)
  purchase_price: number;
  mrp: number;
  discount_percentage: number;
  selling_price: number;
  wholesale_price?: number;
  // Mid pack tier (e.g. Strip or Box)
  use_mid_pack: boolean;
  mid_unit_name: string;
  mid_factor: number; // base units per mid pack
  mid_barcode: string;
  mid_purchase_price: number;
  mid_selling_price: number;
  mid_mrp: number;
  // Outer pack tier (e.g. Box or Carton)
  use_outer_pack: boolean;
  outer_unit_name: string;
  outer_factor: number; // base units per outer pack
  outer_barcode: string;
  outer_purchase_price: number;
  outer_selling_price: number;
  outer_mrp: number;
  // Stock & Batch
  stock_quantity: number;
  min_stock_level: number;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  supplier_id: string;
  warranty: string;
  existing_batches?: BatchLot[];
  active: boolean;
}

interface BulkRowDraft {
  rowId: string;
  is_medicine: boolean;
  name: string;
  generic_name: string;
  brand_name: string;
  company_name: string;
  category_id: string;
  medicine_type: MedicineType;
  strength: string;
  sku: string;
  barcode: string;
  base_unit: UnitType;
  mid_unit_name: string;
  mid_factor: number;
  outer_unit_name: string;
  outer_factor: number;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  stock_quantity: number;
  min_stock_level: number;
  batch_number: string;
  expiry_date: string;
  rack_number: string;
  supplier_id: string;
}

interface PresetPhoto {
  name: string;
  category: string;
  url: string;
}

const GROCERY_PRESETS: PresetPhoto[] = [
  { name: 'Tablets / Medicine Blister Pack', category: 'Medicine', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80' },
  { name: 'Capsules & Vitamins', category: 'Medicine', url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=80' },
  { name: 'Liquid Syrup Bottle', category: 'Medicine', url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&auto=format&fit=crop&q=80' },
  { name: 'Injection Vial & Ampoule', category: 'Medicine', url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&auto=format&fit=crop&q=80' },
  { name: 'Nazirshail / Miniket Rice (চাল)', category: 'Rice & Grains', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80' },
  { name: 'Basmati Rice', category: 'Rice & Grains', url: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&auto=format&fit=crop&q=80' },
  { name: 'Soybean Oil (সয়াবিন তেল)', category: 'Cooking Oils', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80' },
  { name: 'Mustard Oil (সরিষার তেল)', category: 'Cooking Oils', url: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400&auto=format&fit=crop&q=80' },
  { name: 'Ghee / Pure Butter (ঘি)', category: 'Cooking Oils', url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80' },
  { name: 'Fresh Milk / Dairy (দুধ)', category: 'Dairy', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80' },
  { name: 'Powder Milk (Dano/Diploma)', category: 'Dairy', url: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=400&auto=format&fit=crop&q=80' },
  { name: 'Turmeric Powder (হলুদ গুঁড়া)', category: 'Spices', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&auto=format&fit=crop&q=80' },
  { name: 'Red Chili Powder (মরিচ গুঁড়া)', category: 'Spices', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80' },
  { name: 'Cumin & Spices (জিরা/ধনিয়া)', category: 'Spices', url: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400&auto=format&fit=crop&q=80' },
  { name: 'Masoor Dal (মসুর ডাল)', category: 'Lentils', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80' },
  { name: 'Chickpeas / Chola (ছোলা)', category: 'Lentils', url: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400&auto=format&fit=crop&q=80' },
  { name: 'Wheat Flour / Atta (আটা/ময়দা)', category: 'Flour', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
  { name: 'Crystal White Sugar (চিনি)', category: 'Loose Goods', url: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&auto=format&fit=crop&q=80' },
  { name: 'Pure Iodized Salt (লবণ)', category: 'Loose Goods', url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80' },
  { name: 'Black Tea Leaves (চা পাতা)', category: 'Beverages', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80' },
  { name: 'Coca-Cola / Soda Can (পানীয়)', category: 'Beverages', url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80' },
  { name: 'Mango / Fruit Juice (জুস)', category: 'Beverages', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop&q=80' },
  { name: 'Tea Biscuits & Cookies (বিস্কুট)', category: 'Snacks & Bakery', url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80' },
  { name: 'Potato Chips & Snacks (চিপস)', category: 'Snacks & Bakery', url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80' },
  { name: 'Bath Soap (Lux/Lifebuoy সাবান)', category: 'Personal Care', url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&auto=format&fit=crop&q=80' },
  { name: 'Hair Care Shampoo (শ্যাম্পু)', category: 'Personal Care', url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80' },
  { name: 'Fresh Farm Eggs (ডিম)', category: 'Produce', url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&auto=format&fit=crop&q=80' },
  { name: 'Red Onions & Garlic (পেঁয়াজ/রসুন)', category: 'Produce', url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=80' },
];

const MEDICINE_TYPES: MedicineType[] = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Drop',
  'Ointment',
  'Inhaler',
  'Powder',
  'Suppository',
  'General',
];

const UNIT_OPTIONS: UnitType[] = [
  'Strip',
  'Piece',
  'Tablet',
  'Capsule',
  'Bottle',
  'Vial',
  'Ampoule',
  'Tube',
  'Sachet',
  'Box',
  'Pack',
  'Carton',
  'Kg',
  'Gram',
  'Liter',
  'Milliliter',
  'Meter',
];

const STRENGTH_SUGGESTIONS = ['500mg', '250mg', '100mg', '50mg', '20mg', '10mg', '100ml', '60ml', '1g'];

export const ProductManagement: React.FC = () => {
  const { products, categories, suppliers, store, saveProduct, saveProductsBulk, archiveProduct, saveCategory } = useApp();
  const medEnabled = isMedicineModuleEnabled(store);
  const genEnabled = isGeneralProductModuleEnabled(store);
  const enabledCategories = categories.filter((c) => isCategoryEnabled(c, store));

  const [search, setSearch] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'medicine' | 'general'>('all');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Modal State
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSimilarMode, setIsSimilarMode] = useState<boolean>(false);
  const [clonedFromTitle, setClonedFromTitle] = useState<string>('');
  const [scannerTarget, setScannerTarget] = useState<
    { type: 'search' } | { type: 'variant'; index: number } | null
  >(null);

  // Bulk Add State
  const [bulkRows, setBulkRows] = useState<BulkRowDraft[]>([]);
  const [showBulkPasteBox, setShowBulkPasteBox] = useState<boolean>(false);
  const [bulkPasteText, setBulkPasteText] = useState<string>('');
  const [bulkError, setBulkError] = useState<string>('');
  const [bulkSuccessBanner, setBulkSuccessBanner] = useState<string>('');

  // Form State (Product & Medicine)
  const [isMedicineMode, setIsMedicineMode] = useState<boolean>(true);
  const [prodName, setProdName] = useState<string>('');
  const [prodGenericName, setProdGenericName] = useState<string>('');
  const [prodBrandName, setProdBrandName] = useState<string>('');
  const [prodCompanyName, setProdCompanyName] = useState<string>('');
  const [prodMedicineType, setProdMedicineType] = useState<string>('Tablet');
  const [prodStrength, setProdStrength] = useState<string>('');
  const [prodRackNumber, setProdRackNumber] = useState<string>('');
  const [prodActive, setProdActive] = useState<boolean>(true);
  const [prodCode, setProdCode] = useState<string>('');
  const [prodCat, setProdCat] = useState<string>('');
  const [prodDesc, setProdDesc] = useState<string>('');
  const [prodImage, setProdImage] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');

  // Quick Add Category Modal State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatCode, setNewCatCode] = useState<string>('');

  // Online Picture Search & Download System State
  const [showOnlineImageModal, setShowOnlineImageModal] = useState<boolean>(false);
  const [onlineImageUrl, setOnlineImageUrl] = useState<string>('');
  const [onlineSearchQuery, setOnlineSearchQuery] = useState<string>('');
  const [isDownloadingImage, setIsDownloadingImage] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string>('');

  // Variants Form State
  const [variantsForm, setVariantsForm] = useState<UnifiedVariantDraft[]>([]);

  // Barcode Label Print Modal State
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState<boolean>(false);
  const [selectedVariantForBarcode, setSelectedVariantForBarcode] = useState<ProductVariant | null>(null);
  const [labelQty, setLabelQty] = useState<number>(6);

  // Generate clean, scanner-readable vector SVG barcode
  const renderBarcodeSvg = (code: string) => {
    const bars: { width: number; isBlack: boolean }[] = [];
    bars.push({ width: 2, isBlack: true }, { width: 1, isBlack: false }, { width: 2, isBlack: true });
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i], 10) || (code.charCodeAt(i) % 7);
      const w1 = (digit % 3) + 1;
      const w2 = ((digit + 1) % 3) + 1;
      bars.push({ width: w1, isBlack: false });
      bars.push({ width: w2, isBlack: true });
      bars.push({ width: 1, isBlack: false });
      bars.push({ width: (digit % 2) + 1, isBlack: true });
    }
    bars.push({ width: 2, isBlack: true }, { width: 1, isBlack: false }, { width: 2, isBlack: true });

    let currentX = 0;
    const rects = bars.map((b, idx) => {
      const x = currentX;
      currentX += b.width * 2;
      if (b.isBlack) {
        return <rect key={idx} x={x} y="0" width={b.width * 2} height="36" fill="#000000" />;
      }
      return null;
    });

    return (
      <svg viewBox={`0 0 ${currentX} 36`} className="w-full h-8 my-1" preserveAspectRatio="none">
        {rects}
      </svg>
    );
  };

  // Quick Category Creation Handler
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCatId = `cat_${Date.now()}`;
    const newCat = {
      id: newCatId,
      name: newCatName.trim(),
      code: newCatCode.trim().toUpperCase() || newCatName.trim().slice(0, 3).toUpperCase(),
      active: true,
    };
    saveCategory(newCat);
    setProdCat(newCatId);
    setNewCatName('');
    setNewCatCode('');
    setShowAddCategoryModal(false);
  };

  const activeProducts = products.filter((p) => !p.archived && isProductEnabled(p, store));

  const effectiveTypeFilter =
    medEnabled && genEnabled ? typeFilter : medEnabled ? 'medicine' : genEnabled ? 'general' : 'all';

  const filteredProducts = activeProducts.filter((p) => {
    const isProdActive = p.active !== false;
    if (statusFilter === 'active' && !isProdActive) return false;
    if (statusFilter === 'inactive' && isProdActive) return false;

    const isMed = isMedicineProduct(p);
    if (effectiveTypeFilter === 'medicine' && !isMed) return false;
    if (effectiveTypeFilter === 'general' && isMed) return false;

    const matchesCat = selectedCat === 'all' || p.category_id === selectedCat;
    const q = search.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (medEnabled && (p.generic_name || '').toLowerCase().includes(q)) ||
      (p.brand_name || '').toLowerCase().includes(q) ||
      (medEnabled && (p.company_name || '').toLowerCase().includes(q)) ||
      (medEnabled && (p.medicine_type || '').toLowerCase().includes(q)) ||
      (medEnabled && (p.strength || '').toLowerCase().includes(q)) ||
      (p.rack_number || '').toLowerCase().includes(q) ||
      p.variants.some(
        (v) =>
          v.barcode.toLowerCase().includes(q) ||
          v.sku.toLowerCase().includes(q) ||
          (medEnabled && (v.batch_number || '').toLowerCase().includes(q))
      );
    return matchesCat && matchesQuery;
  });

  // Ensure Medicine Category exists if user switches into Medicine mode
  const ensureMedicineCategoryId = (): string => {
    const existingMed = categories.find(
      (c) =>
        c.id === 'cat_medicine' ||
        c.name.toLowerCase().includes('medicine') ||
        c.name.toLowerCase().includes('pharmacy')
    );
    if (existingMed) return existingMed.id;
    const created = {
      id: 'cat_medicine',
      name: 'Medicine & Pharmacy (ওষুধ)',
      code: 'MED',
      active: true,
    };
    saveCategory(created);
    return created.id;
  };

  // Local File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setImageError('ছবির সাইজ 3MB এর কম হতে হবে (Image must be under 3MB).');
      return;
    }
    setImageError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProdImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Online Image Download & Offline Storage Handler
  const handleDownloadOnlineImage = async (url: string) => {
    if (!url.trim()) return;
    setIsDownloadingImage(true);
    setDownloadSuccessToast('');
    try {
      const res = await fetch(url.trim(), { mode: 'cors' });
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProdImage(reader.result);
          setIsDownloadingImage(false);
          setDownloadSuccessToast('Photo downloaded & saved locally!');
          setTimeout(() => {
            setShowOnlineImageModal(false);
            setDownloadSuccessToast('');
          }, 500);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setProdImage(url.trim());
      setIsDownloadingImage(false);
      setDownloadSuccessToast('Photo attached successfully!');
      setTimeout(() => {
        setShowOnlineImageModal(false);
        setDownloadSuccessToast('');
      }, 500);
    }
  };

  const buildDefaultDraft = (medMode: boolean, index: number): UnifiedVariantDraft => {
    const ts = Date.now().toString().slice(-4);
    if (medMode) {
      return {
        variant_name: index === 0 ? 'Standard 500mg' : `Variant #${index + 1}`,
        sku: `MED-${ts}-${index + 1}`,
        barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        strength: '500mg',
        base_unit: 'Tablet',
        purchase_price: 8,
        mrp: 10,
        discount_percentage: 0,
        selling_price: 10,
        wholesale_price: 9,
        use_mid_pack: true,
        mid_unit_name: 'Strip',
        mid_factor: 10,
        mid_barcode: '',
        mid_purchase_price: 80,
        mid_selling_price: 100,
        mid_mrp: 100,
        use_outer_pack: true,
        outer_unit_name: 'Box',
        outer_factor: 100,
        outer_barcode: '',
        outer_purchase_price: 800,
        outer_selling_price: 1000,
        outer_mrp: 1000,
        stock_quantity: 100,
        min_stock_level: 10,
        batch_number: `B-${new Date().getFullYear().toString().slice(-2)}${ts.slice(-2)}`,
        mfg_date: '',
        expiry_date: '',
        supplier_id: '',
        warranty: '',
        active: true,
      };
    }
    return {
      variant_name: index === 0 ? 'Standard' : `Variant #${index + 1}`,
      sku: `PRD-${ts}-${index + 1}`,
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      strength: '',
      base_unit: 'Packet',
      purchase_price: 20,
      mrp: 30,
      discount_percentage: 0,
      selling_price: 25,
      wholesale_price: 22,
      use_mid_pack: true,
      mid_unit_name: 'Box',
      mid_factor: 12,
      mid_barcode: '',
      mid_purchase_price: 240,
      mid_selling_price: 300,
      mid_mrp: 360,
      use_outer_pack: false,
      outer_unit_name: 'Carton',
      outer_factor: 24,
      outer_barcode: '',
      outer_purchase_price: 480,
      outer_selling_price: 600,
      outer_mrp: 650,
      stock_quantity: 100,
      min_stock_level: 20,
      batch_number: '',
      mfg_date: '',
      expiry_date: '',
      supplier_id: '',
      warranty: '',
      active: true,
    };
  };

  const variantToDraft = (v: ProductVariant, pStrength?: string, medMode?: boolean): UnifiedVariantDraft => {
    const baseUnit = getVariantBaseUnit(v) as UnitType;
    const pkgOpts = getVariantPackagingOptions(v).filter((o) => o.conversion_factor > 1);
    const sortedAsc = [...pkgOpts].sort((a, b) => a.conversion_factor - b.conversion_factor);
    const mid = sortedAsc[0];
    const outer = sortedAsc[1];

    return {
      id: v.id,
      variant_name: v.variant_name,
      sku: v.sku,
      barcode: v.barcode,
      strength: v.strength || pStrength || '',
      base_unit: baseUnit,
      purchase_price: v.purchase_price,
      mrp: v.mrp ?? v.selling_price,
      discount_percentage: v.discount_percentage ?? 0,
      selling_price: v.selling_price,
      wholesale_price: v.wholesale_price,
      use_mid_pack: Boolean(mid),
      mid_unit_name: mid?.unit_name || (medMode ? 'Strip' : 'Box'),
      mid_factor: mid?.conversion_factor || (medMode ? 10 : 12),
      mid_barcode: mid?.barcode || '',
      mid_purchase_price: mid?.purchase_price ?? v.purchase_price * (medMode ? 10 : 12),
      mid_selling_price: mid?.selling_price ?? v.selling_price * (medMode ? 10 : 12),
      mid_mrp: mid?.mrp ?? (v.mrp ?? v.selling_price) * (medMode ? 10 : 12),
      use_outer_pack: Boolean(outer),
      outer_unit_name: outer?.unit_name || (medMode ? 'Box' : 'Carton'),
      outer_factor: outer?.conversion_factor || (medMode ? 100 : 24),
      outer_barcode: outer?.barcode || '',
      outer_purchase_price: outer?.purchase_price ?? v.purchase_price * (medMode ? 100 : 24),
      outer_selling_price: outer?.selling_price ?? v.selling_price * (medMode ? 100 : 24),
      outer_mrp: outer?.mrp ?? (v.mrp ?? v.selling_price) * (medMode ? 100 : 24),
      stock_quantity: v.stock_quantity,
      min_stock_level: v.min_stock_level,
      batch_number: v.batch_number || '',
      mfg_date: v.mfg_date || '',
      expiry_date: v.expiry_date || '',
      supplier_id: v.supplier_id || '',
      warranty: v.warranty || '',
      existing_batches: v.batches,
      active: v.active,
    };
  };

  const createBulkRow = (medMode: boolean, offset: number = 0): BulkRowDraft => {
    const resolvedMed = medMode && medEnabled ? true : !genEnabled ? true : false;
    const seq = `${Date.now().toString().slice(-4)}${offset}`;
    const randBarcode = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const medCatId =
      categories.find(
        (c) =>
          c.id === 'cat_medicine' ||
          c.name.toLowerCase().includes('medicine') ||
          c.name.toLowerCase().includes('pharmacy')
      )?.id || enabledCategories[0]?.id || 'cat_medicine';
    const genCatId =
      enabledCategories.find(
        (c) => c.id === 'cat_general' || c.name.toLowerCase().includes('general')
      )?.id || enabledCategories[0]?.id || 'cat_general';

    if (resolvedMed) {
      return {
        rowId: `brow_${Date.now()}_${offset}_${Math.random().toString(36).slice(2, 6)}`,
        is_medicine: true,
        name: '',
        generic_name: '',
        brand_name: '',
        company_name: '',
        category_id: medCatId,
        medicine_type: 'Tablet',
        strength: '500mg',
        sku: `MED-${seq}`,
        barcode: randBarcode,
        base_unit: 'Tablet',
        mid_unit_name: 'Strip',
        mid_factor: 10,
        outer_unit_name: 'Box',
        outer_factor: 100,
        purchase_price: 0,
        selling_price: 0,
        mrp: 0,
        stock_quantity: 0,
        min_stock_level: 10,
        batch_number: `B-${new Date().getFullYear().toString().slice(-2)}${offset + 1}`,
        expiry_date: '',
        rack_number: '',
        supplier_id: '',
      };
    }
    return {
      rowId: `brow_${Date.now()}_${offset}_${Math.random().toString(36).slice(2, 6)}`,
      is_medicine: false,
      name: '',
      generic_name: '',
      brand_name: '',
      company_name: '',
      category_id: genCatId,
      medicine_type: 'General',
      strength: '',
      sku: `PRD-${seq}`,
      barcode: randBarcode,
      base_unit: 'Piece',
      mid_unit_name: 'Box',
      mid_factor: 12,
      outer_unit_name: 'Carton',
      outer_factor: 0,
      purchase_price: 0,
      selling_price: 0,
      mrp: 0,
      stock_quantity: 0,
      min_stock_level: 10,
      batch_number: '',
      expiry_date: '',
      rack_number: '',
      supplier_id: '',
    };
  };

  const openAddModal = (mode: 'medicine' | 'product' = 'medicine', initialEntryMode: 'single' | 'bulk' = 'single') => {
    const resolvedMode: 'medicine' | 'product' =
      mode === 'medicine' && !medEnabled ? 'product' : mode === 'product' && !genEnabled ? 'medicine' : mode;
    const medMode = resolvedMode === 'medicine' && medEnabled;
    setEditingProduct(null);
    setIsSimilarMode(false);
    setClonedFromTitle('');
    setEntryMode(initialEntryMode);
    setIsMedicineMode(medMode);
    setProdName('');
    setProdGenericName('');
    setProdBrandName('');
    setProdCompanyName('');
    setProdMedicineType(medMode ? 'Tablet' : 'General');
    setProdStrength(medMode ? '500mg' : '');
    setProdRackNumber('');
    setProdActive(true);
    setProdCode(`${medMode ? 'MED' : 'PRD'}-${Date.now().toString().slice(-4)}`);
    setImageError('');
    setBulkError('');
    setShowBulkPasteBox(false);
    setBulkPasteText('');

    if (medMode) {
      setProdCat(ensureMedicineCategoryId());
    } else {
      const generalCat = enabledCategories.find(
        (c) => c.id === 'cat_general' || c.name.toLowerCase().includes('general')
      );
      setProdCat(generalCat ? generalCat.id : enabledCategories[0]?.id || 'cat_general');
    }

    setProdDesc('');
    setProdImage('');
    setVariantsForm([buildDefaultDraft(medMode, 0)]);
    setBulkRows([
      createBulkRow(medEnabled, 0),
      createBulkRow(medEnabled ? false : false, 1),
      createBulkRow(medMode, 2),
    ]);
    setShowProductModal(true);
  };

  const openAddSimilarModal = (product: Product) => {
    const medMode = Boolean(
      product.is_medicine || product.generic_name || (product.medicine_type && product.medicine_type !== 'General')
    );
    setEditingProduct(null);
    setEntryMode('single');
    setIsSimilarMode(true);
    setClonedFromTitle(product.name);
    setIsMedicineMode(medMode);
    setProdName(`${product.name} (Similar)`);
    setProdGenericName(product.generic_name || '');
    setProdBrandName(product.brand_name || '');
    setProdCompanyName(product.company_name || '');
    setProdMedicineType(product.medicine_type || (medMode ? 'Tablet' : 'General'));
    setProdStrength(product.strength || '');
    setProdRackNumber(product.rack_number || '');
    setProdActive(product.active !== false);
    setProdCode(`${medMode ? 'MED' : 'PRD'}-${Date.now().toString().slice(-4)}`);
    setProdCat(product.category_id);
    setProdDesc(product.description || '');
    setProdImage(product.image || '');
    setImageError('');

    setVariantsForm(
      product.variants.map((v, idx) => ({
        ...variantToDraft(v, product.strength, medMode),
        id: undefined,
        sku: `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`,
        barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        mid_barcode: '',
        outer_barcode: '',
        existing_batches: undefined,
      }))
    );
    setShowProductModal(true);
  };

  const openEditModal = (p: Product) => {
    const medMode = Boolean(
      p.is_medicine || p.generic_name || (p.medicine_type && p.medicine_type !== 'General')
    );
    setEditingProduct(p);
    setEntryMode('single');
    setIsSimilarMode(false);
    setClonedFromTitle('');
    setIsMedicineMode(medMode);
    setProdName(p.name);
    setProdGenericName(p.generic_name || '');
    setProdBrandName(p.brand_name || '');
    setProdCompanyName(p.company_name || '');
    setProdMedicineType(p.medicine_type || (medMode ? 'Tablet' : 'General'));
    setProdStrength(p.strength || '');
    setProdRackNumber(p.rack_number || '');
    setProdActive(p.active !== false);
    setProdCode(p.code);
    setProdCat(p.category_id);
    setProdDesc(p.description || '');
    setProdImage(p.image || '');
    setImageError('');
    setVariantsForm(p.variants.map((v) => variantToDraft(v, p.strength, medMode)));
    setShowProductModal(true);
  };

  const handleToggleProductActive = (p: Product) => {
    const nextActive = p.active === false;
    saveProduct({
      ...p,
      active: nextActive,
      updated_at: new Date().toISOString(),
    });
  };

  const handleAddVariantRow = () => {
    setVariantsForm([...variantsForm, buildDefaultDraft(isMedicineMode, variantsForm.length)]);
  };

  const handleDuplicateVariantRow = (idx: number) => {
    const target = variantsForm[idx];
    const cloned: UnifiedVariantDraft = {
      ...target,
      id: undefined,
      variant_name: `${target.variant_name} (Copy)`,
      sku: `SKU-${Date.now().toString().slice(-4)}-${variantsForm.length + 1}`,
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      mid_barcode: '',
      outer_barcode: '',
      existing_batches: undefined,
    };
    const updated = [...variantsForm];
    updated.splice(idx + 1, 0, cloned);
    setVariantsForm(updated);
  };

  const handleRemoveVariantRow = (idx: number) => {
    if (variantsForm.length <= 1) return;
    const updated = variantsForm.filter((_, i) => i !== idx);
    setVariantsForm(updated);
  };

  const saveUnifiedProduct = (addAnother: boolean) => {
    if (!prodName.trim()) return;
    const prodId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
    const now = new Date().toISOString();

    const fullVariants: ProductVariant[] = variantsForm.map((vf, idx) => {
      const varId = vf.id || editingProduct?.variants[idx]?.id || `var_${Date.now()}_${idx}`;
      const baseUnit = vf.base_unit || (isMedicineMode ? 'Tablet' : 'Piece');
      const packagingUnits: PackagingUnitConfig[] = [
        {
          id: `pkg_base_${varId}`,
          unit_name: baseUnit,
          conversion_factor: 1,
          is_base: true,
          barcode: vf.barcode.trim(),
          purchase_price: Number(vf.purchase_price) || 0,
          selling_price: Number(vf.selling_price) || 0,
          mrp: Number(vf.mrp || vf.selling_price) || 0,
        },
      ];

      if (vf.use_mid_pack && vf.mid_unit_name.trim() && vf.mid_factor > 1) {
        packagingUnits.push({
          id: `pkg_mid_${varId}`,
          unit_name: vf.mid_unit_name.trim(),
          conversion_factor: Number(vf.mid_factor) || 10,
          is_base: false,
          barcode: vf.mid_barcode.trim() || undefined,
          purchase_price:
            Number(vf.mid_purchase_price) ||
            Math.round(vf.purchase_price * vf.mid_factor * 100) / 100,
          selling_price:
            Number(vf.mid_selling_price) ||
            Math.round(vf.selling_price * vf.mid_factor * 100) / 100,
          mrp:
            Number(vf.mid_mrp) ||
            Math.round((vf.mrp || vf.selling_price) * vf.mid_factor * 100) / 100,
        });
      }

      if (vf.use_outer_pack && vf.outer_unit_name.trim() && vf.outer_factor > 1) {
        packagingUnits.push({
          id: `pkg_outer_${varId}`,
          unit_name: vf.outer_unit_name.trim(),
          conversion_factor: Number(vf.outer_factor) || 100,
          is_base: false,
          barcode: vf.outer_barcode.trim() || undefined,
          purchase_price:
            Number(vf.outer_purchase_price) ||
            Math.round(vf.purchase_price * vf.outer_factor * 100) / 100,
          selling_price:
            Number(vf.outer_selling_price) ||
            Math.round(vf.selling_price * vf.outer_factor * 100) / 100,
          mrp:
            Number(vf.outer_mrp) ||
            Math.round((vf.mrp || vf.selling_price) * vf.outer_factor * 100) / 100,
        });
      }

      const batchNo = vf.batch_number.trim() || undefined;
      let batches: BatchLot[] | undefined = vf.existing_batches ? [...vf.existing_batches] : undefined;
      if (batchNo || vf.expiry_date || vf.mfg_date) {
        if (batches && batches.length > 0) {
          batches[0] = {
            ...batches[0],
            batch_number: batchNo || batches[0].batch_number,
            mfg_date: vf.mfg_date || undefined,
            expiry_date: vf.expiry_date || undefined,
            supplier_id: vf.supplier_id || undefined,
            purchase_price: Number(vf.purchase_price) || 0,
            stock_quantity: batches.length === 1 ? vf.stock_quantity : batches[0].stock_quantity,
          };
        } else {
          batches = [
            {
              id: `batch_${Date.now()}_${idx}`,
              batch_number: batchNo || `B-${new Date().getFullYear().toString().slice(-2)}01`,
              mfg_date: vf.mfg_date || undefined,
              expiry_date: vf.expiry_date || undefined,
              stock_quantity: vf.stock_quantity,
              purchase_price: Number(vf.purchase_price) || 0,
              supplier_id: vf.supplier_id || undefined,
              created_at: now,
            },
          ];
        }
      }

      return {
        id: varId,
        product_id: prodId,
        variant_name: vf.variant_name.trim() || baseUnit,
        sku: vf.sku.trim() || `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`,
        barcode: vf.barcode.trim(),
        strength: vf.strength.trim() || prodStrength.trim() || undefined,
        unit: baseUnit,
        base_unit: baseUnit,
        packaging_units: packagingUnits.sort((a, b) => b.conversion_factor - a.conversion_factor),
        purchase_price: Number(vf.purchase_price) || 0,
        selling_price: Number(vf.selling_price) || 0,
        mrp: Number(vf.mrp || vf.selling_price) || 0,
        discount_percentage: Number(vf.discount_percentage) || 0,
        wholesale_price: vf.wholesale_price,
        stock_quantity: Number(vf.stock_quantity) || 0,
        min_stock_level: Number(vf.min_stock_level) || 0,
        supplier_id: vf.supplier_id || undefined,
        batch_number: batchNo,
        mfg_date: vf.mfg_date || undefined,
        expiry_date: vf.expiry_date || undefined,
        batches,
        warranty: vf.warranty.trim() || undefined,
        active: vf.active,
        created_at: editingProduct?.variants[idx]?.created_at || now,
        updated_at: now,
        sync_status: 'pending',
        branch_id: store.branch_id,
        device_id: store.device_id,
      };
    });

    const newProd: Product = {
      id: prodId,
      name: prodName.trim(),
      generic_name: isMedicineMode ? prodGenericName.trim() || undefined : undefined,
      brand_name: prodBrandName.trim() || undefined,
      company_name: isMedicineMode ? prodCompanyName.trim() || undefined : undefined,
      medicine_type: isMedicineMode ? prodMedicineType || 'Tablet' : 'General',
      strength: isMedicineMode ? prodStrength.trim() || fullVariants[0]?.strength || undefined : undefined,
      rack_number: prodRackNumber.trim() || undefined,
      is_medicine: isMedicineMode,
      active: prodActive,
      code: prodCode.trim() || `${isMedicineMode ? 'MED' : 'PRD'}-${Date.now().toString().slice(-4)}`,
      category_id: prodCat,
      description: prodDesc.trim() || undefined,
      image: prodImage.trim() || undefined,
      variants: fullVariants,
      archived: false,
      created_at: editingProduct ? editingProduct.created_at : now,
      updated_at: now,
      sync_status: 'pending',
      branch_id: store.branch_id,
      device_id: store.device_id,
    };

    saveProduct(newProd);
    if (addAnother) {
      openAddModal(isMedicineMode ? 'medicine' : 'product');
    } else {
      setShowProductModal(false);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    saveUnifiedProduct(false);
  };

  // --- BULK ADD HANDLERS ---
  const parseDelimitedBulkText = (rawText: string) => {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setBulkError('কোনো ডেটা পাওয়া যায়নি।');
      return;
    }

    const parsed: BulkRowDraft[] = [];
    lines.forEach((line, idx) => {
      const delimiter = line.includes('\t') ? '\t' : ',';
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
      // Skip header row if detected
      if (
        idx === 0 &&
        (cols[0].toLowerCase() === 'type' ||
          cols[0].toLowerCase() === 'name' ||
          (cols[1] || '').toLowerCase() === 'name')
      ) {
        return;
      }

      const firstLower = (cols[0] || '').toLowerCase();
      const isTypeCol =
        firstLower === 'medicine' ||
        firstLower === 'med' ||
        firstLower === 'general' ||
        firstLower === 'product';
      const isMedRow = isTypeCol
        ? (firstLower === 'medicine' || firstLower === 'med') && medEnabled
        : medEnabled;
      const offset = isTypeCol ? 1 : 0;

      const name = cols[offset] || '';
      if (!name) return;

      const baseDraft = createBulkRow(isMedRow, idx);
      const genericOrBrand = cols[offset + 1] || '';
      const companyOrBrand = cols[offset + 2] || '';
      const strength = cols[offset + 3] || '';
      const baseUnitRaw = (cols[offset + 4] || '') as UnitType;
      const validBaseUnit = UNIT_OPTIONS.includes(baseUnitRaw) ? baseUnitRaw : baseDraft.base_unit;
      const midName = cols[offset + 5] || baseDraft.mid_unit_name;
      const midFactor = parseFloat(cols[offset + 6] || '') || (isMedRow ? 10 : 0);
      const purchase = parseFloat(cols[offset + 7] || '') || 0;
      const sale = parseFloat(cols[offset + 8] || '') || 0;
      const mrpVal = parseFloat(cols[offset + 9] || '') || sale;
      const stockVal = parseFloat(cols[offset + 10] || '') || 0;
      const batchVal = cols[offset + 11] || baseDraft.batch_number;
      const expiryVal = cols[offset + 12] || '';
      const rackVal = cols[offset + 13] || '';
      const barcodeVal = cols[offset + 14] || baseDraft.barcode;

      parsed.push({
        ...baseDraft,
        name,
        generic_name: isMedRow ? genericOrBrand : '',
        brand_name: isMedRow ? companyOrBrand : genericOrBrand,
        company_name: isMedRow ? companyOrBrand : '',
        strength: isMedRow ? strength : '',
        base_unit: validBaseUnit,
        mid_unit_name: midName,
        mid_factor: midFactor,
        purchase_price: purchase,
        selling_price: sale,
        mrp: mrpVal,
        stock_quantity: stockVal,
        batch_number: batchVal,
        expiry_date: expiryVal,
        rack_number: rackVal,
        barcode: barcodeVal,
      });
    });

    if (parsed.length === 0) {
      setBulkError('ভ্যালিড কোনো সারি পাওয়া যায়নি। কলাম ফরম্যাট চেক করুন অথবা টেমপ্লেট ডাউনলোড করুন।');
      return;
    }
    setBulkError('');
    setBulkRows((prev) => [...prev.filter((r) => r.name.trim() !== ''), ...parsed]);
    setBulkPasteText('');
    setShowBulkPasteBox(false);
  };

  const handleBulkCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        parseDelimitedBulkText(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadBulkTemplate = () => {
    const header =
      'Type,Name,Generic_Or_Brand,Company_Or_Manufacturer,Strength,Base_Unit,Pack_Unit,Pack_Factor,Purchase_Price,Sale_Price,MRP,Opening_Stock,Batch_No,Expiry_Date,Rack_No,Barcode';
    const sampleMed =
      'Medicine,Napa Extra,Paracetamol + Caffeine,Beximco Pharma,500mg+65mg,Tablet,Strip,10,1.8,2.5,2.5,200,B2505,2027-12-31,A-01,890123456001';
    const sampleProd =
      'General,Fresh Soyabean Oil 1L,Fresh,Meghna Group,,Piece,Carton,12,165,178,185,48,,,B-04,890123456002';
    const csv = `${header}\n${medEnabled ? `${sampleMed}\n` : ''}${genEnabled ? `${sampleProd}\n` : ''}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bulk_medicine_product_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveBulkRows = () => {
    const validRows = bulkRows.filter((r) => r.name.trim() !== '');
    if (validRows.length === 0) {
      setBulkError('অন্তত ১টি ওষুধ বা পণ্যের নাম লিখুন।');
      return;
    }

    const now = new Date().toISOString();
    const baseTs = Date.now();
    const medCatId = medEnabled ? ensureMedicineCategoryId() : enabledCategories[0]?.id || 'cat_general';

    const productsToCreate: Product[] = validRows.map((row, idx) => {
      const isMed = row.is_medicine && medEnabled;
      const prodId = `prod_${baseTs}_${idx}`;
      const varId = `var_${baseTs}_${idx}_0`;
      const baseUnit = row.base_unit || (isMed ? 'Tablet' : 'Piece');

      const packagingUnits: PackagingUnitConfig[] = [
        {
          id: `pkg_${baseTs}_${idx}_base`,
          unit_name: baseUnit,
          conversion_factor: 1,
          purchase_price: Number(row.purchase_price) || 0,
          selling_price: Number(row.selling_price) || 0,
          mrp: Number(row.mrp) || Number(row.selling_price) || 0,
          barcode: row.barcode.trim(),
          is_base: true,
        },
      ];

      if (row.mid_unit_name.trim() && row.mid_factor > 1) {
        const mf = Number(row.mid_factor);
        packagingUnits.push({
          id: `pkg_${baseTs}_${idx}_mid`,
          unit_name: row.mid_unit_name.trim(),
          conversion_factor: mf,
          purchase_price: Math.round((Number(row.purchase_price) || 0) * mf * 100) / 100,
          selling_price: Math.round((Number(row.selling_price) || 0) * mf * 100) / 100,
          mrp: Math.round((Number(row.mrp) || Number(row.selling_price) || 0) * mf * 100) / 100,
        });
      }

      if (row.outer_unit_name.trim() && row.outer_factor > 1) {
        const of = Number(row.outer_factor);
        packagingUnits.push({
          id: `pkg_${baseTs}_${idx}_outer`,
          unit_name: row.outer_unit_name.trim(),
          conversion_factor: of,
          purchase_price: Math.round((Number(row.purchase_price) || 0) * of * 100) / 100,
          selling_price: Math.round((Number(row.selling_price) || 0) * of * 100) / 100,
          mrp: Math.round((Number(row.mrp) || Number(row.selling_price) || 0) * of * 100) / 100,
        });
      }

      const batches: BatchLot[] = [];
      if (row.batch_number.trim() || row.expiry_date) {
        batches.push({
          id: `batch_${baseTs}_${idx}`,
          batch_number: row.batch_number.trim() || `B-${baseTs.toString().slice(-4)}`,
          expiry_date: row.expiry_date || undefined,
          stock_quantity: Number(row.stock_quantity) || 0,
          purchase_price: Number(row.purchase_price) || 0,
          supplier_id: row.supplier_id || undefined,
          created_at: now,
        });
      }

      const mrpNum = Number(row.mrp) || Number(row.selling_price) || 0;
      const saleNum = Number(row.selling_price) || 0;
      const discountPct =
        mrpNum > saleNum && mrpNum > 0 ? Math.round(((mrpNum - saleNum) / mrpNum) * 100 * 100) / 100 : 0;

      const variant: ProductVariant = {
        id: varId,
        product_id: prodId,
        variant_name: isMed && row.strength.trim() ? `${row.name.trim()} ${row.strength.trim()}` : 'Standard',
        sku: row.sku.trim() || `${isMed ? 'MED' : 'PRD'}-${baseTs.toString().slice(-4)}-${idx + 1}`,
        barcode: row.barcode.trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        strength: isMed ? row.strength.trim() || undefined : undefined,
        unit: baseUnit,
        base_unit: baseUnit,
        packaging_units: packagingUnits,
        purchase_price: Number(row.purchase_price) || 0,
        mrp: mrpNum,
        discount_percentage: discountPct,
        selling_price: saleNum,
        stock_quantity: Number(row.stock_quantity) || 0,
        min_stock_level: Number(row.min_stock_level) || 10,
        batch_number: row.batch_number.trim() || undefined,
        expiry_date: row.expiry_date || undefined,
        batches,
        supplier_id: row.supplier_id || undefined,
        active: true,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        branch_id: store.branch_id,
        device_id: store.device_id,
      };

      return {
        id: prodId,
        name: row.name.trim(),
        generic_name: isMed ? row.generic_name.trim() || undefined : undefined,
        brand_name: row.brand_name.trim() || undefined,
        company_name: isMed ? row.company_name.trim() || undefined : undefined,
        medicine_type: isMed ? row.medicine_type : 'General',
        strength: isMed ? row.strength.trim() || undefined : undefined,
        rack_number: row.rack_number.trim() || undefined,
        is_medicine: isMed,
        active: true,
        code: `${isMed ? 'MED' : 'PRD'}-${baseTs.toString().slice(-4)}-${idx + 1}`,
        category_id: row.category_id || (isMed ? medCatId : enabledCategories[0]?.id || 'cat_general'),
        variants: [variant],
        archived: false,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        branch_id: store.branch_id,
        device_id: store.device_id,
      };
    });

    saveProductsBulk(productsToCreate);
    setBulkError('');
    setShowProductModal(false);
    setBulkSuccessBanner(`✓ ${productsToCreate.length}টি নতুন ওষুধ / পণ্য একসাথে সফলভাবে যোগ করা হয়েছে!`);
    setTimeout(() => setBulkSuccessBanner(''), 5000);
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Page Title & Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            {medEnabled ? (
              <Pill className="w-6 h-6 text-[#ec1f73]" />
            ) : (
              <Package className="w-6 h-6 text-[#5b46b5]" />
            )}
            <span>
              {medEnabled && genEnabled
                ? 'All Product & Medicine Management'
                : medEnabled
                ? 'Medicine Management (Pharmacy)'
                : 'General Product Management'}
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            {medEnabled
              ? 'সব পণ্য ও নতুন ওষুধ যোগ করুন — একক অথবা Bulk Add, Generic, Brand, Company, Variant, Packaging Conversion, Batch, MRP ও Rack সহ।'
              : 'সব সাধারণ পণ্য যোগ করুন — একক অথবা Bulk Add, Variant, Packaging Conversion, Brand, Unit, Barcode, MRP ও Rack সহ।'}
          </p>
        </div>

        {(medEnabled || genEnabled) && (
          <div className="flex items-center self-start sm:self-auto">
            <button
              type="button"
              onClick={() => openAddModal(medEnabled ? 'medicine' : 'product', 'single')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ec1f73] to-[#5b46b5] hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {medEnabled ? <Pill className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>
                {medEnabled && genEnabled
                  ? '+ নতুন ওষুধ / পণ্য ও Bulk Add (Add & Bulk)'
                  : medEnabled
                  ? '+ নতুন ওষুধ ও Bulk Add (Add Medicine)'
                  : '+ Add Product & Bulk Add'}
              </span>
            </button>
          </div>
        )}
      </div>

      {bulkSuccessBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{bulkSuccessBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setBulkSuccessBanner('')}
            className="text-emerald-600 hover:text-emerald-900 font-bold px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              medEnabled
                ? 'Search by Medicine/Product Name, Generic, Brand, Company, Strength, Batch, Rack or Barcode...'
                : 'Search by Product Name, Brand, Code, Rack or Barcode...'
            }
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-24 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
          <button
            type="button"
            onClick={() => setScannerTarget({ type: 'search' })}
            title="Scan QR or Barcode to search product"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-white bg-[#5b46b5] hover:bg-[#4a379c] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>SCAN</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="all">All Categories</option>
            {enabledCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {medEnabled && genEnabled && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'medicine' | 'general')}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="all">All Types</option>
              <option value="medicine">Medicine Only</option>
              <option value="general">General Product</option>
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Product & Medicine List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {filteredProducts.map((p) => {
            const isExpanded = expandedProductId === p.id;
            const categoryName = categories.find((c) => c.id === p.category_id)?.name || 'General';
            const isActive = p.active !== false;

            return (
              <div
                key={p.id}
                className={`transition-colors hover:bg-slate-50/80 ${!isActive ? 'opacity-65 bg-slate-50/60' : ''}`}
              >
                {/* Product Master Header Row */}
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setExpandedProductId(isExpanded ? null : p.id)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {p.image ? (
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-xs">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border shrink-0 ${
                          p.is_medicine
                            ? 'bg-pink-50 text-[#ec1f73] border-pink-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}
                      >
                        {p.is_medicine ? <Pill className="w-5 h-5" /> : p.name.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h3 className="font-bold text-sm text-slate-800">{p.name}</h3>
                        {medEnabled && p.strength && (
                          <span className="text-[11px] font-bold font-mono text-[#5b46b5]">
                            {p.strength}
                          </span>
                        )}
                        {medEnabled && p.medicine_type && p.medicine_type !== 'General' && (
                          <span className="text-[11px] font-semibold text-[#ec1f73]">
                            · {p.medicine_type}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          [{p.code}]
                        </span>
                        <span className="text-[11px] text-blue-700 font-medium">
                          · {categoryName}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {medEnabled && p.generic_name && (
                          <span>
                            Generic: <strong className="text-slate-700">{p.generic_name}</strong>
                          </span>
                        )}
                        {p.brand_name && (
                          <span>
                            · Brand: <strong className="text-slate-700">{p.brand_name}</strong>
                          </span>
                        )}
                        {medEnabled && p.company_name && (
                          <span>
                            · Company: <strong className="text-slate-700">{p.company_name}</strong>
                          </span>
                        )}
                        {p.rack_number && (
                          <span className="font-mono text-[#5b46b5]">
                            · Rack: {p.rack_number}
                          </span>
                        )}
                        <span>· {p.variants.length} Variant(s)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 pl-8 sm:pl-0">
                    <button
                      type="button"
                      onClick={() => handleToggleProductActive(p)}
                      title="Toggle Active / Inactive status"
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                      }`}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddSimilarModal(p)}
                      title="Add Similar Product (Clone template with new barcode/SKU)"
                      className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                    >
                      <CopyPlus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Add Similar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveProduct(p.id)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 hover:border-rose-200 cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  </div>
                </div>

                {/* Variant Expansion Details */}
                {isExpanded && (
                  <div className="bg-slate-50/70 p-4 border-t border-slate-100 space-y-2">
                    {p.description && (
                      <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2">
                        <strong className="text-slate-700">বিবরণ / Description:</strong> {p.description}
                      </p>
                    )}

                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>{medEnabled ? 'Variants, Batch, MRP & Stock Entries' : 'Variants, MRP & Stock Entries'}</span>
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                            <th className="py-2 pr-2">VARIANT / UNIT</th>
                            <th className="py-2 pr-2">BARCODE</th>
                            {medEnabled && <th className="py-2 pr-2">BATCH / EXP</th>}
                            <th className="py-2 pr-2 text-right">PURCHASE</th>
                            <th className="py-2 pr-2 text-right">MRP / DISC</th>
                            <th className="py-2 pr-2 text-right">SALE PRICE</th>
                            <th className="py-2 pr-2 text-center">STOCK</th>
                            <th className="py-2 pr-2 text-center">STATUS</th>
                            <th className="py-2 text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {p.variants.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-100/50">
                              <td className="py-2.5 pr-2 font-semibold text-slate-800">
                                {v.variant_name}
                                {medEnabled && v.strength ? ` (${v.strength})` : ''}
                              </td>
                              <td className="py-2.5 pr-2 font-mono text-slate-500">{v.barcode}</td>
                              {medEnabled && (
                                <td className="py-2.5 pr-2 font-mono text-[11px] text-slate-600">
                                  {v.batch_number || '—'}
                                  {v.expiry_date ? ` · ${v.expiry_date}` : ''}
                                </td>
                              )}
                              <td className="py-2.5 pr-2 text-right font-mono text-slate-600">
                                {store.currency_symbol}
                                {v.purchase_price}
                              </td>
                              <td className="py-2.5 pr-2 text-right font-mono text-slate-600">
                                {v.mrp !== undefined ? `${store.currency_symbol}${v.mrp}` : '—'}
                                {v.discount_percentage ? ` (-${v.discount_percentage}%)` : ''}
                              </td>
                              <td className="py-2.5 pr-2 text-right font-mono font-bold text-slate-900">
                                {store.currency_symbol}
                                {v.selling_price}/{v.unit}
                              </td>
                              <td className="py-2.5 pr-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                    v.stock_quantity <= v.min_stock_level
                                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {formatStockBreakdown(v.stock_quantity, v)}
                                </span>
                              </td>
                              <td className="py-2.5 pr-2 text-center text-[11px] font-semibold">
                                <span className={v.active ? 'text-emerald-700' : 'text-slate-400'}>
                                  {v.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedVariantForBarcode(v);
                                    setShowBarcodePrintModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <Barcode className="w-3 h-3 text-blue-600" />
                                  <span>Print Label</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-xs">
              কোনো পণ্য বা ওষুধ পাওয়া যায়নি। নতুন ওষুধ বা পণ্য যোগ করতে উপরের বাটনে ক্লিক করুন।
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT / SIMILAR / BULK PRODUCT & MEDICINE MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 w-full text-slate-800 shadow-2xl max-h-[94vh] flex flex-col transition-all ${
              entryMode === 'bulk' && !editingProduct ? 'max-w-7xl' : 'max-w-3xl'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-slate-800">
                  {entryMode === 'bulk' && !editingProduct ? (
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  ) : isSimilarMode ? (
                    <CopyPlus className="w-5 h-5 text-blue-600" />
                  ) : isMedicineMode ? (
                    <Pill className="w-5 h-5 text-[#ec1f73]" />
                  ) : (
                    <Package className="w-5 h-5 text-[#5b46b5]" />
                  )}
                  <span>
                    {editingProduct
                      ? medEnabled
                        ? 'Edit Product & Medicine'
                        : 'Edit Product'
                      : entryMode === 'bulk'
                      ? 'Bulk Add — একসাথে একাধিক ওষুধ ও পণ্য যোগ করুন'
                      : isSimilarMode
                      ? medEnabled
                        ? 'Add Similar Product / Medicine'
                        : 'Add Similar Product'
                      : isMedicineMode && medEnabled
                      ? 'নতুন ওষুধ যোগ করা (Add New Medicine)'
                      : medEnabled
                      ? 'Add New Product & Medicine'
                      : 'Add New Product'}
                  </span>
                </h3>

                {/* Single Entry vs Bulk Add Switcher inside unified modal */}
                {!editingProduct && !isSimilarMode && (
                  <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl text-[11px] font-bold border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEntryMode('single')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        entryMode === 'single'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Single Add (একক)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMode('bulk')}
                      className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                        entryMode === 'bulk'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Bulk Add (একসাথে অনেকগুলো)</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mode Toggle: Medicine vs General Product (in Single mode) */}
                {entryMode === 'single' && medEnabled && genEnabled && (
                  <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMedicineMode(true);
                        if (prodMedicineType === 'General') setProdMedicineType('Tablet');
                        if (!editingProduct) {
                          setProdCat(ensureMedicineCategoryId());
                          setVariantsForm([buildDefaultDraft(true, 0)]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        isMedicineMode
                          ? 'bg-[#ec1f73] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Medicine (ওষুধ)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMedicineMode(false);
                        setProdMedicineType('General');
                        if (!editingProduct) {
                          const generalCat = enabledCategories.find(
                            (c) => c.id === 'cat_general' || c.name.toLowerCase().includes('general')
                          );
                          setProdCat(generalCat ? generalCat.id : enabledCategories[0]?.id || 'cat_general');
                          setVariantsForm([buildDefaultDraft(false, 0)]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        !isMedicineMode
                          ? 'bg-[#5b46b5] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      General Product (পণ্য)
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {entryMode === 'bulk' && !editingProduct ? (
              <div className="flex flex-col flex-1 overflow-hidden mt-3 space-y-3">
                {/* Bulk Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {medEnabled && (
                      <button
                        type="button"
                        onClick={() =>
                          setBulkRows((prev) => [...prev, createBulkRow(true, prev.length)])
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Pill className="w-3.5 h-3.5" />
                        <span>+ Add Medicine Row</span>
                      </button>
                    )}
                    {genEnabled && (
                      <button
                        type="button"
                        onClick={() =>
                          setBulkRows((prev) => [...prev, createBulkRow(false, prev.length)])
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#5b46b5] hover:bg-[#4a379c] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>+ Add Product Row</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setBulkRows((prev) => [
                          ...prev,
                          ...Array.from({ length: 5 }, (_, i) =>
                            createBulkRow(medEnabled, prev.length + i)
                          ),
                        ])
                      }
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      + 5 Blank Rows
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadBulkTemplate}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>CSV Template</span>
                    </button>
                    <label className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload CSV</span>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleBulkCsvUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBulkPasteBox((v) => !v)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Paste Excel / CSV</span>
                    </button>
                  </div>
                </div>

                {showBulkPasteBox && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900">
                        Excel / Google Sheets বা CSV থেকে কপি-পেস্ট করুন (Format: Type, Name, Generic/Brand, Company, Strength, Base Unit, Pack Unit, Factor, Purchase, Sale, MRP, Stock, Batch, Expiry, Rack, Barcode)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBulkPasteBox(false)}
                        className="text-amber-700 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      placeholder={'Medicine, Napa, Paracetamol, Beximco, 500mg, Tablet, Strip, 10, 0.8, 1.2, 1.2, 500, B2501, 2027-12-31, A-01\nGeneral, Lux Soap 100g, Lux, Unilever, , Piece, Carton, 24, 48, 55, 60, 48, , , B-02'}
                      className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => parseDelimitedBulkText(bulkPasteText)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Parse & Add Rows to Table
                      </button>
                    </div>
                  </div>
                )}

                {bulkError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2 shrink-0">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bulkError}</span>
                  </div>
                )}

                {/* Bulk Spreadsheet Table */}
                <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left border-collapse text-xs min-w-[1400px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="p-2 w-8 text-center">#</th>
                        <th className="p-2 w-28">ধরন (Type)</th>
                        <th className="p-2 min-w-[160px]">ওষুধ / পণ্যের নাম *</th>
                        <th className="p-2 min-w-[130px]">Generic / Brand</th>
                        <th className="p-2 min-w-[130px]">Company / Category</th>
                        <th className="p-2 min-w-[125px]">Dosage / Strength</th>
                        <th className="p-2 min-w-[155px]">Unit & Pack Conv.</th>
                        <th className="p-2 min-w-[130px]">Barcode / SKU</th>
                        <th className="p-2 w-20">Purchase</th>
                        <th className="p-2 w-20">Sale Price</th>
                        <th className="p-2 w-20">MRP</th>
                        <th className="p-2 w-20">Stock (Base)</th>
                        <th className="p-2 min-w-[135px]">Batch & Expiry</th>
                        <th className="p-2 min-w-[115px]">Rack / Supplier</th>
                        <th className="p-2 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkRows.map((row, idx) => (
                        <tr
                          key={row.rowId}
                          className={`hover:bg-slate-50/90 ${
                            row.is_medicine ? 'bg-pink-50/15' : 'bg-indigo-50/15'
                          }`}
                        >
                          <td className="p-2 text-center font-mono text-[11px] text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-1.5">
                            {medEnabled && genEnabled ? (
                              <select
                                value={row.is_medicine ? 'medicine' : 'general'}
                                onChange={(e) => {
                                  const nextMed = e.target.value === 'medicine';
                                  setBulkRows((prev) =>
                                    prev.map((r) =>
                                      r.rowId === row.rowId
                                        ? {
                                            ...r,
                                            is_medicine: nextMed,
                                            medicine_type: nextMed ? 'Tablet' : 'General',
                                            base_unit: nextMed ? 'Tablet' : 'Piece',
                                            mid_unit_name: nextMed ? 'Strip' : 'Box',
                                            mid_factor: nextMed ? 10 : 12,
                                            outer_unit_name: nextMed ? 'Box' : 'Carton',
                                            outer_factor: nextMed ? 100 : 0,
                                          }
                                        : r
                                    )
                                  );
                                }}
                                className={`w-full rounded-lg px-2 py-1.5 text-[11px] font-bold border ${
                                  row.is_medicine
                                    ? 'bg-pink-50 border-pink-300 text-[#ec1f73]'
                                    : 'bg-indigo-50 border-indigo-300 text-[#5b46b5]'
                                }`}
                              >
                                <option value="medicine">Medicine (ওষুধ)</option>
                                <option value="general">Product (পণ্য)</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-block px-2 py-1 rounded-lg text-[11px] font-bold ${
                                  row.is_medicine
                                    ? 'bg-pink-50 text-[#ec1f73]'
                                    : 'bg-indigo-50 text-[#5b46b5]'
                                }`}
                              >
                                {row.is_medicine ? 'Medicine' : 'Product'}
                              </span>
                            )}
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId ? { ...r, name: e.target.value } : r
                                  )
                                )
                              }
                              placeholder={row.is_medicine ? 'যেমন: Napa 500' : 'যেমন: Biscuit 200g'}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800"
                            />
                          </td>
                          <td className="p-1.5 space-y-1">
                            {row.is_medicine && (
                              <input
                                type="text"
                                value={row.generic_name}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r) =>
                                      r.rowId === row.rowId
                                        ? { ...r, generic_name: e.target.value }
                                        : r
                                    )
                                  )
                                }
                                placeholder="Generic (Paracetamol)"
                                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px]"
                              />
                            )}
                            <input
                              type="text"
                              value={row.brand_name}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, brand_name: e.target.value }
                                      : r
                                  )
                                )
                              }
                              placeholder="Brand Name"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px]"
                            />
                          </td>
                          <td className="p-1.5 space-y-1">
                            {row.is_medicine && (
                              <input
                                type="text"
                                value={row.company_name}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r) =>
                                      r.rowId === row.rowId
                                        ? { ...r, company_name: e.target.value }
                                        : r
                                    )
                                  )
                                }
                                placeholder="Company (Square)"
                                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px]"
                              />
                            )}
                            <select
                              value={row.category_id}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, category_id: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-1.5 py-1 text-[11px]"
                            >
                              {enabledCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-1.5 space-y-1">
                            {row.is_medicine ? (
                              <>
                                <select
                                  value={row.medicine_type}
                                  onChange={(e) =>
                                    setBulkRows((prev) =>
                                      prev.map((r) =>
                                        r.rowId === row.rowId
                                          ? { ...r, medicine_type: e.target.value as MedicineType }
                                          : r
                                      )
                                    )
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-lg px-1.5 py-1 text-[11px]"
                                >
                                  {MEDICINE_TYPES.filter((t) => t !== 'General').map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={row.strength}
                                  onChange={(e) =>
                                    setBulkRows((prev) =>
                                      prev.map((r) =>
                                        r.rowId === row.rowId
                                          ? { ...r, strength: e.target.value }
                                          : r
                                      )
                                    )
                                  }
                                  placeholder="500mg"
                                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-mono"
                                />
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">General Item</span>
                            )}
                          </td>
                          <td className="p-1.5 space-y-1">
                            <div className="flex items-center gap-1">
                              <select
                                value={row.base_unit}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r) =>
                                      r.rowId === row.rowId
                                        ? { ...r, base_unit: e.target.value as UnitType }
                                        : r
                                    )
                                  )
                                }
                                title="Base Unit"
                                className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] font-semibold"
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <input
                                type="text"
                                value={row.mid_unit_name}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r) =>
                                      r.rowId === row.rowId
                                        ? { ...r, mid_unit_name: e.target.value }
                                        : r
                                    )
                                  )
                                }
                                placeholder="Pack"
                                className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px]"
                              />
                              <span>×</span>
                              <input
                                type="number"
                                min="0"
                                value={row.mid_factor || ''}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r) =>
                                      r.rowId === row.rowId
                                        ? { ...r, mid_factor: parseFloat(e.target.value) || 0 }
                                        : r
                                    )
                                  )
                                }
                                placeholder="10"
                                className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-mono"
                              />
                            </div>
                          </td>
                          <td className="p-1.5 space-y-1">
                            <input
                              type="text"
                              value={row.barcode}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId ? { ...r, barcode: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="Barcode"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-mono"
                            />
                            <input
                              type="text"
                              value={row.sku}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId ? { ...r, sku: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="SKU"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-[10px] font-mono text-slate-600"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.purchase_price || ''}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, purchase_price: parseFloat(e.target.value) || 0 }
                                      : r
                                  )
                                )
                              }
                              placeholder="0.00"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.selling_price || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, selling_price: val, mrp: r.mrp || val }
                                      : r
                                  )
                                );
                              }}
                              placeholder="0.00"
                              className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-blue-700"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.mrp || ''}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, mrp: parseFloat(e.target.value) || 0 }
                                      : r
                                  )
                                )
                              }
                              placeholder="0.00"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono"
                            />
                          </td>
                          <td className="p-1.5 space-y-1">
                            <input
                              type="number"
                              min="0"
                              value={row.stock_quantity || ''}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, stock_quantity: parseFloat(e.target.value) || 0 }
                                      : r
                                  )
                                )
                              }
                              placeholder="Qty"
                              className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-700"
                            />
                            <input
                              type="number"
                              min="0"
                              value={row.min_stock_level || ''}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, min_stock_level: parseFloat(e.target.value) || 0 }
                                      : r
                                  )
                                )
                              }
                              title="Min Stock Alert"
                              placeholder="Min"
                              className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-500"
                            />
                          </td>
                          <td className="p-1.5 space-y-1">
                            <input
                              type="text"
                              value={row.batch_number}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, batch_number: e.target.value }
                                      : r
                                  )
                                )
                              }
                              placeholder="Batch No"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-mono"
                            />
                            <input
                              type="date"
                              value={row.expiry_date}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, expiry_date: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono"
                            />
                          </td>
                          <td className="p-1.5 space-y-1">
                            <input
                              type="text"
                              value={row.rack_number}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, rack_number: e.target.value }
                                      : r
                                  )
                                )
                              }
                              placeholder="Rack (A-01)"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-mono"
                            />
                            <select
                              value={row.supplier_id}
                              onChange={(e) =>
                                setBulkRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, supplier_id: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-[10px]"
                            >
                              <option value="">Supplier</option>
                              {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Duplicate row"
                                onClick={() =>
                                  setBulkRows((prev) => [
                                    ...prev,
                                    {
                                      ...row,
                                      rowId: `brow_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                      sku: `${row.is_medicine ? 'MED' : 'PRD'}-${Date.now().toString().slice(-4)}-${prev.length + 1}`,
                                      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                                    },
                                  ])
                                }
                                className="p-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {bulkRows.length > 1 && (
                                <button
                                  type="button"
                                  title="Remove row"
                                  onClick={() =>
                                    setBulkRows((prev) =>
                                      prev.filter((r) => r.rowId !== row.rowId)
                                    )
                                  }
                                  className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 cursor-pointer"
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

                {/* Bulk Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 shrink-0">
                  <div className="text-xs text-slate-600">
                    মোট প্রস্তুত সারি:{' '}
                    <strong className="text-emerald-700">
                      {bulkRows.filter((r) => r.name.trim() !== '').length}
                    </strong>{' '}
                    / {bulkRows.length}টি (খালি নামগুলো স্বয়ংক্রিয়ভাবে বাদ যাবে)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowProductModal(false)}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBulkRows}
                      className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Save {bulkRows.filter((r) => r.name.trim() !== '').length || 0} Medicines & Products (একসাথে সেভ করুন)
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {isSimilarMode && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2 shrink-0">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Adding similar product pre-filled from <strong>{clonedFromTitle}</strong>. Fresh unique barcodes and SKUs have been generated automatically.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSaveProduct} className="space-y-4 my-4 overflow-y-auto flex-1 pr-1">
              {/* SECTION 1: PRODUCT / MEDICINE CORE IDENTITY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isMedicineMode && medEnabled
                      ? 'ওষুধের নাম (Medicine Name) *'
                      : medEnabled
                      ? 'Product / Medicine Name *'
                      : 'Product Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder={isMedicineMode && medEnabled ? 'e.g. Napa Extra / Seclo 20' : 'e.g. Nazirshail Rice'}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                {medEnabled && isMedicineMode && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Generic Name (জেনেরিক নাম)
                    </label>
                    <input
                      type="text"
                      value={prodGenericName}
                      onChange={(e) => setProdGenericName(e.target.value)}
                      placeholder="e.g. Paracetamol + Caffeine"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand Name (ব্র্যান্ড নাম)
                  </label>
                  <input
                    type="text"
                    value={prodBrandName}
                    onChange={(e) => setProdBrandName(e.target.value)}
                    placeholder={isMedicineMode ? 'e.g. Napa / Sergel / ACI' : 'e.g. Pran / Aarong / Fresh'}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {medEnabled && isMedicineMode && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Company Name (কোম্পানির নাম)
                    </label>
                    <input
                      type="text"
                      value={prodCompanyName}
                      onChange={(e) => setProdCompanyName(e.target.value)}
                      placeholder="e.g. Beximco / Square / Incepta"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                      title="Add a custom category"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Category</span>
                    </button>
                  </div>
                  <select
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {enabledCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {medEnabled && isMedicineMode && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Medicine Type / Dosage Form
                    </label>
                    <select
                      value={prodMedicineType}
                      onChange={(e) => setProdMedicineType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {MEDICINE_TYPES.map((mt) => (
                        <option key={mt} value={mt}>
                          {mt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {medEnabled && isMedicineMode && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Strength (পাওয়ার / মাত্রা)
                    </label>
                    <input
                      type="text"
                      value={prodStrength}
                      onChange={(e) => setProdStrength(e.target.value)}
                      placeholder="e.g. 500mg, 250mg, 100ml"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {STRENGTH_SUGGESTIONS.slice(0, 5).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setProdStrength(s)}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-[#5b46b5] cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rack / Shelf Number (তাক নং)
                  </label>
                  <input
                    type="text"
                    value={prodRackNumber}
                    onChange={(e) => setProdRackNumber(e.target.value)}
                    placeholder="e.g. Rack A-2 / Shelf 4"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status (Active / Inactive)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setProdActive(true)}
                      className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        prodActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProdActive(false)}
                      className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        !prodActive
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Inactive</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Description (ওষুধের বিবরণ) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {medEnabled ? 'ওষুধ / পণ্যের বিবরণ (Description & Dosage Notes)' : 'পণ্যের বিবরণ (Product Description)'}
                </label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder={medEnabled ? 'ওষুধের ব্যবহার, ডোজ, বা পণ্যের বিস্তারিত বিবরণ লিখুন...' : 'পণ্যের বিস্তারিত বিবরণ লিখুন...'}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Product Picture Upload & Online Download Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>ছবি (Product / Medicine Photo)</span>
                  </label>
                  {prodImage && (
                    <button
                      type="button"
                      onClick={() => setProdImage('')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Picture</span>
                    </button>
                  )}
                </div>

                {imageError && (
                  <p className="text-xs text-rose-600 font-semibold">{imageError}</p>
                )}

                <div className="flex items-center gap-3">
                  {/* Image Preview Box */}
                  <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                    {prodImage ? (
                      <img src={prodImage} alt="Product Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <ImageIcon className="w-7 h-7 mb-1 opacity-40 text-slate-500" />
                        <span className="text-[9px] font-semibold text-slate-400">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-blue-400 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all">
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>Upload from Device</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setOnlineSearchQuery(prodName.split(' ')[0] || (isMedicineMode ? 'Medicine' : ''));
                          setShowOnlineImageModal(true);
                        }}
                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>Online Download & Presets</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      ফোন/কম্পিউটার থেকে ছবি আপলোড করুন অথবা অনলাইন লাইব্রেরি থেকে ওষুধ/পণ্যের ছবি নিন।
                    </p>
                  </div>
                </div>
              </div>

              {/* Variants, Barcode, Batch, Pricing (Purchase, MRP, Discount, Sale Price) & Stock */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#5b46b5] uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Pack / Batch / Pricing & Stock ({variantsForm.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variant</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {variantsForm.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 relative"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-bold text-slate-700">
                            Variant #{idx + 1}
                          </span>
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={v.active}
                              onChange={(e) => {
                                const updated = [...variantsForm];
                                updated[idx] = { ...updated[idx], active: e.target.checked };
                                setVariantsForm(updated);
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-0"
                            />
                            <span className={v.active ? 'text-emerald-700' : 'text-rose-600'}>
                              {v.active ? 'Active' : 'Inactive'}
                            </span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDuplicateVariantRow(idx)}
                            title="Duplicate this variant row"
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 bg-white hover:bg-blue-50 border border-slate-200 px-2 py-0.5 rounded shadow-sm cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Duplicate</span>
                          </button>
                          {variantsForm.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVariantRow(idx)}
                              title="Remove variant"
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 bg-white hover:bg-rose-50 border border-slate-200 px-2 py-0.5 rounded shadow-sm cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 1: Variant Name, Strength (if med), SKU, Barcode + Scan, Base Unit */}
                      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isMedicineMode ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2`}>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Variant Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={v.variant_name}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx] = { ...updated[idx], variant_name: e.target.value };
                              setVariantsForm(updated);
                            }}
                            placeholder={isMedicineMode ? 'e.g. Napa 500 / Napa 665' : 'e.g. 100ml / 200ml / Standard'}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                          />
                        </div>

                        {isMedicineMode && (
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                              Strength
                            </label>
                            <input
                              type="text"
                              value={v.strength}
                              onChange={(e) => {
                                const updated = [...variantsForm];
                                updated[idx] = { ...updated[idx], strength: e.target.value };
                                setVariantsForm(updated);
                              }}
                              placeholder="500 mg"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            SKU *
                          </label>
                          <input
                            type="text"
                            required
                            value={v.sku}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx] = { ...updated[idx], sku: e.target.value };
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Base Barcode *
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              required
                              value={v.barcode}
                              onChange={(e) => {
                                const updated = [...variantsForm];
                                updated[idx] = { ...updated[idx], barcode: e.target.value };
                                setVariantsForm(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setScannerTarget({ type: 'variant', index: idx })}
                              title="Scan product Barcode / QR"
                              className="p-1.5 rounded-lg bg-[#5b46b5] hover:bg-[#4a379c] text-white shrink-0 transition-colors cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Base Unit (Stock Unit) *
                          </label>
                          <select
                            value={v.base_unit}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx] = { ...updated[idx], base_unit: e.target.value as UnitType };
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-semibold"
                          >
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Packaging Conversion Tiers (Mid & Outer Pack) */}
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-700">
                          <span>Packaging Conversion & Unit-wise Pricing (Base: {v.base_unit})</span>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={v.use_mid_pack}
                                onChange={(e) => {
                                  const updated = [...variantsForm];
                                  updated[idx] = { ...updated[idx], use_mid_pack: e.target.checked };
                                  setVariantsForm(updated);
                                }}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span>+ {isMedicineMode ? 'Strip' : 'Box'} Pack</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={v.use_outer_pack}
                                onChange={(e) => {
                                  const updated = [...variantsForm];
                                  updated[idx] = { ...updated[idx], use_outer_pack: e.target.checked };
                                  setVariantsForm(updated);
                                }}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span>+ {isMedicineMode ? 'Box' : 'Carton'} Pack</span>
                            </label>
                          </div>
                        </div>

                        {/* Unit-wise Pricing Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500">
                                <th className="py-1 pr-2">Unit</th>
                                <th className="py-1 pr-2">= Base ({v.base_unit})</th>
                                <th className="py-1 pr-2">Purchase ({store.currency_symbol})</th>
                                <th className="py-1 pr-2">Sale Price ({store.currency_symbol})</th>
                                <th className="py-1 pr-2">MRP ({store.currency_symbol})</th>
                                <th className="py-1">Pack Barcode (Optional)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {v.use_outer_pack && (
                                <tr>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="text"
                                      value={v.outer_unit_name}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], outer_unit_name: e.target.value };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-20 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px] font-semibold"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="number"
                                      min="2"
                                      value={v.outer_factor}
                                      onChange={(e) => {
                                        const f = Math.max(2, parseFloat(e.target.value) || 2);
                                        const updated = [...variantsForm];
                                        updated[idx] = {
                                          ...updated[idx],
                                          outer_factor: f,
                                          outer_purchase_price: Math.round(v.purchase_price * f * 100) / 100,
                                          outer_selling_price: Math.round(v.selling_price * f * 100) / 100,
                                          outer_mrp: Math.round((v.mrp || v.selling_price) * f * 100) / 100,
                                        };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-16 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={v.outer_purchase_price}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], outer_purchase_price: parseFloat(e.target.value) || 0 };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={v.outer_selling_price}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], outer_selling_price: parseFloat(e.target.value) || 0 };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono font-bold text-[#ec1f73]"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={v.outer_mrp}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], outer_mrp: parseFloat(e.target.value) || 0 };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                    />
                                  </td>
                                  <td className="py-1.5">
                                    <input
                                      type="text"
                                      value={v.outer_barcode}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], outer_barcode: e.target.value };
                                        setVariantsForm(updated);
                                      }}
                                      placeholder="Optional"
                                      className="w-24 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                    />
                                  </td>
                                </tr>
                              )}

                              {v.use_mid_pack && (
                                <tr>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="text"
                                      value={v.mid_unit_name}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], mid_unit_name: e.target.value };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-20 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px] font-semibold"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="number"
                                      min="2"
                                      value={v.mid_factor}
                                      onChange={(e) => {
                                        const f = Math.max(2, parseFloat(e.target.value) || 2);
                                        const updated = [...variantsForm];
                                        updated[idx] = {
                                          ...updated[idx],
                                          mid_factor: f,
                                          mid_purchase_price: Math.round(v.purchase_price * f * 100) / 100,
                                          mid_selling_price: Math.round(v.selling_price * f * 100) / 100,
                                          mid_mrp: Math.round((v.mrp || v.selling_price) * f * 100) / 100,
                                        };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-16 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={v.mid_purchase_price}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], mid_purchase_price: parseFloat(e.target.value) || 0 };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={v.mid_selling_price}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], mid_selling_price: parseFloat(e.target.value) || 0 };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono font-bold text-[#ec1f73]"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={v.mid_mrp}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], mid_mrp: parseFloat(e.target.value) || 0 };
                                        setVariantsForm(updated);
                                      }}
                                      className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                    />
                                  </td>
                                  <td className="py-1.5">
                                    <input
                                      type="text"
                                      value={v.mid_barcode}
                                      onChange={(e) => {
                                        const updated = [...variantsForm];
                                        updated[idx] = { ...updated[idx], mid_barcode: e.target.value };
                                        setVariantsForm(updated);
                                      }}
                                      placeholder="Optional"
                                      className="w-24 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                    />
                                  </td>
                                </tr>
                              )}

                              <tr className="bg-indigo-50/40">
                                <td className="py-1.5 pr-2 font-bold text-indigo-800">{v.base_unit} (Base)</td>
                                <td className="py-1.5 pr-2 font-mono text-slate-600">1</td>
                                <td className="py-1.5 pr-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={v.purchase_price}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const updated = [...variantsForm];
                                      updated[idx] = {
                                        ...updated[idx],
                                        purchase_price: val,
                                        mid_purchase_price: Math.round(val * v.mid_factor * 100) / 100,
                                        outer_purchase_price: Math.round(val * v.outer_factor * 100) / 100,
                                      };
                                      setVariantsForm(updated);
                                    }}
                                    className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                  />
                                </td>
                                <td className="py-1.5 pr-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={v.selling_price}
                                    onChange={(e) => {
                                      const saleVal = parseFloat(e.target.value) || 0;
                                      const mrpVal = v.mrp || 0;
                                      const calcDisc =
                                        mrpVal > 0 && saleVal <= mrpVal
                                          ? Math.round(((mrpVal - saleVal) / mrpVal) * 1000) / 10
                                          : 0;
                                      const updated = [...variantsForm];
                                      updated[idx] = {
                                        ...updated[idx],
                                        selling_price: saleVal,
                                        discount_percentage: mrpVal > 0 ? calcDisc : v.discount_percentage,
                                        mid_selling_price: Math.round(saleVal * v.mid_factor * 100) / 100,
                                        outer_selling_price: Math.round(saleVal * v.outer_factor * 100) / 100,
                                      };
                                      setVariantsForm(updated);
                                    }}
                                    className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono font-bold text-[#ec1f73]"
                                  />
                                </td>
                                <td className="py-1.5 pr-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={v.mrp}
                                    onChange={(e) => {
                                      const mrpVal = parseFloat(e.target.value) || 0;
                                      const disc = v.discount_percentage || 0;
                                      const nextSale =
                                        mrpVal > 0 && disc > 0
                                          ? Math.round(mrpVal * (1 - disc / 100) * 100) / 100
                                          : mrpVal > 0
                                          ? mrpVal
                                          : v.selling_price;
                                      const updated = [...variantsForm];
                                      updated[idx] = {
                                        ...updated[idx],
                                        mrp: mrpVal,
                                        selling_price: nextSale,
                                        mid_mrp: Math.round(mrpVal * v.mid_factor * 100) / 100,
                                        outer_mrp: Math.round(mrpVal * v.outer_factor * 100) / 100,
                                        mid_selling_price: Math.round(nextSale * v.mid_factor * 100) / 100,
                                        outer_selling_price: Math.round(nextSale * v.outer_factor * 100) / 100,
                                      };
                                      setVariantsForm(updated);
                                    }}
                                    className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 font-mono"
                                  />
                                </td>
                                <td className="py-1.5 text-[10px] font-mono text-slate-500">
                                  Uses Base Barcode ({v.barcode || '—'})
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Row 3: Batch, Mfg Date, Expiry Date, Opening Stock (Base Unit), Min Stock, Supplier */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Opening Stock ({v.base_unit}) *
                          </label>
                          <input
                            type="number"
                            required
                            value={v.stock_quantity}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx] = {
                                ...updated[idx],
                                stock_quantity: parseFloat(e.target.value) || 0,
                              };
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Min Stock Alert *
                          </label>
                          <input
                            type="number"
                            required
                            value={v.min_stock_level}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx] = {
                                ...updated[idx],
                                min_stock_level: parseFloat(e.target.value) || 0,
                              };
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Batch Number
                          </label>
                          <input
                            type="text"
                            value={v.batch_number}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx] = { ...updated[idx], batch_number: e.target.value };
                              setVariantsForm(updated);
                            }}
                            placeholder="e.g. B250401"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Mfg. Date
                          </label>
                          <input
                            type="date"
                            value={v.mfg_date}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx] = { ...updated[idx], mfg_date: e.target.value };
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            value={v.expiry_date}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx] = { ...updated[idx], expiry_date: e.target.value };
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Supplier
                          </label>
                          <select
                            value={v.supplier_id}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx] = { ...updated[idx], supplier_id: e.target.value };
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                          >
                            <option value="">Select Supplier</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold shadow transition-colors cursor-pointer ${
                    isMedicineMode
                      ? 'bg-[#ec1f73] hover:bg-[#d61665]'
                      : 'bg-[#5b46b5] hover:bg-[#4a379c]'
                  }`}
                >
                  {isMedicineMode ? 'Save Medicine' : 'Save Product'}
                </button>
                {!editingProduct && (
                  <button
                    type="button"
                    onClick={() => saveUnifiedProduct(true)}
                    className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-colors cursor-pointer"
                  >
                    + Save & Add Another
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* QUICK ADD CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>Add New Category (নতুন ক্যাটাগরি)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name * (ক্যাটাগরির নাম)
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Frozen Foods, Fish & Meat, Bakery"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Code (ঐচ্ছিক কোড)
                </label>
                <input
                  type="text"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value)}
                  placeholder="e.g. FRZ, MEAT, BAK"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 uppercase font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-colors"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE LABEL PRINT MODAL (FIXED PRINT SYSTEM) */}
      {showBarcodePrintModal && selectedVariantForBarcode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 text-slate-800 shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:p-0 print:rounded-none">
            {/* Modal Header (Hidden on Print) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 no-print">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Barcode Label Printing System (বারকোড প্রিন্ট)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ready for Thermal Barcode Printers (50x30mm) or A4 Sticker Sheets.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBarcodePrintModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Label Quantity Controls (Hidden on Print) */}
            <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shrink-0 no-print">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Number of Sticker Labels to Print:
                </label>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {labelQty} Label(s)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[1, 4, 6, 12, 24, 48].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setLabelQty(qty)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      labelQty === qty
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {qty} Labels
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[11px] text-slate-500">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={labelQty}
                    onChange={(e) => setLabelQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-center font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Printable Area: Barcode Label Sheet */}
            <div className="overflow-y-auto flex-1 p-2 bg-slate-100 rounded-xl print:p-0 print:bg-white print:overflow-visible">
              <div className="printable-area barcode-sheet-print grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: labelQty }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white text-black border border-dashed border-slate-300 rounded-xl text-center font-mono shadow-xs flex flex-col justify-between break-inside-avoid print:border-black/40 print:rounded-none print:shadow-none"
                  >
                    <div className="text-[10px] font-bold tracking-tight uppercase truncate">
                      {store.store_name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-900 truncate my-0.5">
                      {selectedVariantForBarcode.variant_name}
                    </div>
                    {/* Realistic Scanner-Readable Vector Barcode */}
                    {renderBarcodeSvg(selectedVariantForBarcode.barcode)}
                    <div className="text-[10px] tracking-widest font-bold">
                      {selectedVariantForBarcode.barcode}
                    </div>
                    <div className="text-xs font-black mt-1 pt-1 border-t border-slate-200 print:border-black">
                      PRICE: {store.currency_symbol}{selectedVariantForBarcode.selling_price}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions (Hidden on Print) */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 no-print">
              <div className="text-[11px] text-slate-500">
                Press Print to open system print dialog.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBarcodePrintModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print {labelQty} Label(s)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ONLINE IMAGE SEARCH & DOWNLOAD MODAL */}
      {showOnlineImageModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full text-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Online Product Image Library & URL Downloader
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select a curated product photo or paste any web image URL to download & save locally.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOnlineImageModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Notification Toast */}
            {downloadSuccessToast && (
              <div className="my-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{downloadSuccessToast}</span>
              </div>
            )}

            <div className="overflow-y-auto flex-1 my-3 space-y-4 pr-1">
              {/* Option 1: Direct Image URL Download */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download from Custom Web URL (অনলাইন ইমেজ লিঙ্ক ডাউনলোড)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={onlineImageUrl}
                    onChange={(e) => setOnlineImageUrl(e.target.value)}
                    placeholder="Paste image link (e.g. https://.../image.jpg)"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    disabled={!onlineImageUrl.trim() || isDownloadingImage}
                    onClick={() => handleDownloadOnlineImage(onlineImageUrl)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                  >
                    {isDownloadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Curated Grocery Presets with Search */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Instant Grocery Photo Presets (১-ক্লিক সিলেক্ট)</span>
                  </label>
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={onlineSearchQuery}
                      onChange={(e) => setOnlineSearchQuery(e.target.value)}
                      placeholder="Search items (Rice, Oil, Milk...)"
                      className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Preset Photo Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
                  {GROCERY_PRESETS.filter((item) => {
                    const q = onlineSearchQuery.toLowerCase().trim();
                    return !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
                  }).map((item, idx) => {
                    const isSelected = prodImage === item.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDownloadOnlineImage(item.url)}
                        className={`group p-2 rounded-xl border text-left flex flex-col justify-between transition-all bg-white shadow-xs relative ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500/30'
                            : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
                        }`}
                      >
                        <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-100 mb-2 relative">
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">
                            {item.category}
                          </div>
                          <div className="text-xs font-bold text-slate-800 line-clamp-1">
                            {item.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowOnlineImageModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR & BARCODE SCANNER MODAL */}
      <QrBarcodeScannerModal
        isOpen={scannerTarget !== null}
        onClose={() => setScannerTarget(null)}
        onScan={(decodedText) => {
          const clean = decodedText.trim();
          if (!clean || !scannerTarget) return;
          if (scannerTarget.type === 'search') {
            setSearch(clean);
          } else if (scannerTarget.type === 'variant') {
            setVariantsForm((prev) => {
              const updated = [...prev];
              if (updated[scannerTarget.index]) {
                updated[scannerTarget.index] = {
                  ...updated[scannerTarget.index],
                  barcode: clean,
                };
              }
              return updated;
            });
          }
        }}
        title={
          scannerTarget?.type === 'variant'
            ? 'Scan Variant Barcode / QR'
            : 'Search Product by QR / Barcode'
        }
        subtitle="প্যাকেটের Barcode বা QR Code স্ক্যান করুন"
      />
    </div>
  );
};
