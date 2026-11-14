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
} from 'lucide-react';
import { Product, ProductVariant, UnitType } from '../../types';
import { QrBarcodeScannerModal } from '../Scanner/QrBarcodeScannerModal';

interface PresetPhoto {
  name: string;
  category: string;
  url: string;
}

const GROCERY_PRESETS: PresetPhoto[] = [
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

export const ProductManagement: React.FC = () => {
  const { products, categories, suppliers, store, saveProduct, archiveProduct, saveCategory } = useApp();
  const [search, setSearch] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Modal State
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSimilarMode, setIsSimilarMode] = useState<boolean>(false);
  const [clonedFromTitle, setClonedFromTitle] = useState<string>('');
  const [scannerTarget, setScannerTarget] = useState<
    { type: 'search' } | { type: 'variant'; index: number } | null
  >(null);

  // Form State
  const [prodName, setProdName] = useState<string>('');
  const [prodCode, setProdCode] = useState<string>('');
  const [prodCat, setProdCat] = useState<string>('');
  const [prodDesc, setProdDesc] = useState<string>('');
  const [prodImage, setProdImage] = useState<string>('');

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
  const [variantsForm, setVariantsForm] = useState<
    Omit<ProductVariant, 'id' | 'product_id' | 'created_at' | 'updated_at' | 'sync_status' | 'branch_id' | 'device_id'>[]
  >([]);

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

  const activeProducts = products.filter((p) => !p.archived);

  const filteredProducts = activeProducts.filter((p) => {
    const matchesCat = selectedCat === 'all' || p.category_id === selectedCat;
    const q = search.toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.variants.some((v) => v.barcode.includes(q) || v.sku.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  // Local File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Image size should be under 3MB for fast offline storage.');
      return;
    }
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
      // Fallback: save direct URL if browser restricts canvas/blob conversion
      setProdImage(url.trim());
      setIsDownloadingImage(false);
      setDownloadSuccessToast('Photo attached successfully!');
      setTimeout(() => {
        setShowOnlineImageModal(false);
        setDownloadSuccessToast('');
      }, 500);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsSimilarMode(false);
    setClonedFromTitle('');
    setProdName('');
    setProdCode(`PRD-${Date.now().toString().slice(-4)}`);
    // Default to General Goods category
    const generalCat = categories.find((c) => c.id === 'cat_general' || c.name.toLowerCase().includes('general'));
    setProdCat(generalCat ? generalCat.id : (categories[0]?.id || 'cat_general'));
    setProdDesc('');
    setProdImage('');
    setVariantsForm([
      {
        variant_name: 'Standard',
        sku: `SKU-${Date.now().toString().slice(-4)}-1`,
        barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        unit: 'Kg',
        purchase_price: 100,
        selling_price: 120,
        wholesale_price: 110,
        stock_quantity: 50,
        min_stock_level: 10,
        active: true,
      },
    ]);
    setShowProductModal(true);
  };

  const openAddSimilarModal = (product: Product) => {
    setEditingProduct(null);
    setIsSimilarMode(true);
    setClonedFromTitle(product.name);
    setProdName(`${product.name} (Similar)`);
    setProdCode(`PRD-${Date.now().toString().slice(-4)}`);
    setProdCat(product.category_id);
    setProdDesc(product.description || '');
    setProdImage(product.image || '');
    
    // Duplicate variants with fresh unique SKUs and Barcodes
    setVariantsForm(
      product.variants.map((v, idx) => ({
        variant_name: v.variant_name,
        sku: `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`,
        barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        unit: v.unit,
        purchase_price: v.purchase_price,
        selling_price: v.selling_price,
        wholesale_price: v.wholesale_price,
        stock_quantity: v.stock_quantity,
        min_stock_level: v.min_stock_level,
        supplier_id: v.supplier_id,
        batch_number: v.batch_number,
        expiry_date: v.expiry_date,
        active: true,
      }))
    );
    setShowProductModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsSimilarMode(false);
    setClonedFromTitle('');
    setProdName(p.name);
    setProdCode(p.code);
    setProdCat(p.category_id);
    setProdDesc(p.description || '');
    setProdImage(p.image || '');
    setVariantsForm(
      p.variants.map((v) => ({
        variant_name: v.variant_name,
        sku: v.sku,
        barcode: v.barcode,
        unit: v.unit,
        purchase_price: v.purchase_price,
        selling_price: v.selling_price,
        wholesale_price: v.wholesale_price,
        stock_quantity: v.stock_quantity,
        min_stock_level: v.min_stock_level,
        supplier_id: v.supplier_id,
        batch_number: v.batch_number,
        expiry_date: v.expiry_date,
        active: v.active,
      }))
    );
    setShowProductModal(true);
  };

  const handleAddVariantRow = () => {
    setVariantsForm([
      ...variantsForm,
      {
        variant_name: 'New Variant',
        sku: `SKU-${Date.now().toString().slice(-4)}-${variantsForm.length + 1}`,
        barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        unit: 'Piece',
        purchase_price: 50,
        selling_price: 65,
        stock_quantity: 20,
        min_stock_level: 5,
        active: true,
      },
    ]);
  };

  const handleDuplicateVariantRow = (idx: number) => {
    const target = variantsForm[idx];
    const cloned: typeof variantsForm[0] = {
      ...target,
      variant_name: `${target.variant_name} (Copy)`,
      sku: `SKU-${Date.now().toString().slice(-4)}-${variantsForm.length + 1}`,
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
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

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const prodId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
    const now = new Date().toISOString();

    const fullVariants: ProductVariant[] = variantsForm.map((vf, idx) => ({
      ...vf,
      id: editingProduct?.variants[idx]?.id || `var_${Date.now()}_${idx}`,
      product_id: prodId,
      created_at: editingProduct?.variants[idx]?.created_at || now,
      updated_at: now,
      sync_status: 'pending',
      branch_id: store.branch_id,
      device_id: store.device_id,
    }));

    const newProd: Product = {
      id: prodId,
      name: prodName,
      code: prodCode,
      category_id: prodCat,
      description: prodDesc,
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
    setShowProductModal(false);
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Page Title & Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Package className="w-6 h-6 text-blue-600" />
            <span>Product & Variant Catalog</span>
          </h1>
          <p className="text-xs text-slate-500">
            Manage master products and their packaging variants, barcodes, pricing, and stock.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product & Variants</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Product Name, Code, Barcode or SKU..."
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

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 shrink-0 shadow-sm w-full sm:w-auto"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {filteredProducts.map((p) => {
            const isExpanded = expandedProductId === p.id;
            const categoryName = categories.find((c) => c.id === p.category_id)?.name || 'General';

            return (
              <div key={p.id} className="transition-colors hover:bg-slate-50/80">
                {/* Product Master Header Row */}
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      onClick={() => setExpandedProductId(isExpanded ? null : p.id)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0"
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
                      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-sm border border-blue-100 shrink-0">
                        {p.name.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h3 className="font-bold text-sm text-slate-800">{p.name}</h3>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {p.code}
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium">
                          {categoryName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.variants.length} Variant(s) Available
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 pl-8 sm:pl-0">
                    <button
                      onClick={() => openAddSimilarModal(p)}
                      title="Add Similar Product (Clone template with new barcode/SKU)"
                      className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors"
                    >
                      <CopyPlus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Add Similar</span>
                    </button>
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => archiveProduct(p.id)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 hover:border-rose-200"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  </div>
                </div>

                {/* Variant Expansion Details */}
                {isExpanded && (
                  <div className="bg-slate-50/70 p-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Variants & Stock Entries</span>
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                            <th className="py-2">VARIANT NAME</th>
                            <th className="py-2">BARCODE</th>
                            <th className="py-2">SKU</th>
                            <th className="py-2 text-right">PURCHASE</th>
                            <th className="py-2 text-right">SELLING</th>
                            <th className="py-2 text-center">STOCK</th>
                            <th className="py-2 text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {p.variants.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-100/50">
                              <td className="py-2.5 font-semibold text-slate-800">
                                {v.variant_name}
                              </td>
                              <td className="py-2.5 font-mono text-slate-500">{v.barcode}</td>
                              <td className="py-2.5 font-mono text-slate-500">{v.sku}</td>
                              <td className="py-2.5 text-right font-mono text-slate-600">
                                {store.currency_symbol}
                                {v.purchase_price}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                                {store.currency_symbol}
                                {v.selling_price}/{v.unit}
                              </td>
                              <td className="py-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                    v.stock_quantity <= v.min_stock_level
                                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {v.stock_quantity} {v.unit}
                                </span>
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedVariantForBarcode(v);
                                    setShowBarcodePrintModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
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
        </div>
      </div>

      {/* ADD / EDIT / SIMILAR PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full text-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-bold flex items-center gap-2 text-slate-800">
                {isSimilarMode ? (
                  <CopyPlus className="w-5 h-5 text-blue-600" />
                ) : (
                  <Package className="w-5 h-5 text-blue-600" />
                )}
                <span>
                  {editingProduct
                    ? 'Edit Product Catalog'
                    : isSimilarMode
                    ? 'Add Similar Product (Cloned Template)'
                    : 'Add New Product & Variants'}
                </span>
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {isSimilarMode && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2 shrink-0">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Adding similar product pre-filled from <strong>{clonedFromTitle}</strong>. Fresh unique barcodes and SKUs have been generated automatically.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 my-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Nazirshail Premium Rice"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                      title="Add a custom category"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ New Category</span>
                    </button>
                  </div>
                  <select
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Picture Upload & Online Download Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>Product Picture (পণ্যের ছবি)</span>
                  </label>
                  {prodImage && (
                    <button
                      type="button"
                      onClick={() => setProdImage('')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Picture</span>
                    </button>
                  )}
                </div>

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
                      {/* Local File Upload Button */}
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

                      {/* Online Search & Download Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setOnlineSearchQuery(prodName.split(' ')[0] || '');
                          setShowOnlineImageModal(true);
                        }}
                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>Online Download & Presets</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Upload from phone/computer or search from online grocery library. Saved locally in browser for offline use.
                    </p>
                  </div>
                </div>
              </div>

              {/* Variants Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Product Variants ({variantsForm.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Variant</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {variantsForm.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 mb-1.5">
                        <span className="text-[11px] font-bold text-slate-600">
                          Variant #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDuplicateVariantRow(idx)}
                            title="Duplicate this variant row"
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 bg-white hover:bg-blue-50 border border-slate-200 px-2 py-0.5 rounded shadow-sm"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Duplicate Variant</span>
                          </button>
                          {variantsForm.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVariantRow(idx)}
                              title="Remove variant"
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 bg-white hover:bg-rose-50 border border-slate-200 px-2 py-0.5 rounded shadow-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600">Variant Name</label>
                          <input
                            type="text"
                            required
                            value={v.variant_name}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx].variant_name = e.target.value;
                              setVariantsForm(updated);
                            }}
                            placeholder="e.g. 1 Kg Pack / 500ml"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600">Barcode</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              required
                              value={v.barcode}
                              onChange={(e) => {
                                const updated = [...variantsForm];
                                updated[idx].barcode = e.target.value;
                                setVariantsForm(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono"
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
                          <label className="block text-[10px] font-semibold text-slate-600">Unit</label>
                          <select
                            value={v.unit}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx].unit = e.target.value as UnitType;
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                          >
                            {['Kg', 'Gram', 'Liter', 'Milliliter', 'Piece', 'Pack', 'Box', 'Bottle', 'Carton'].map(
                              (u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600">Purchase Price</label>
                          <input
                            type="number"
                            required
                            value={v.purchase_price}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx].purchase_price = parseFloat(e.target.value) || 0;
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600">Selling Price</label>
                          <input
                            type="number"
                            required
                            value={v.selling_price}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx].selling_price = parseFloat(e.target.value) || 0;
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600">Current Stock</label>
                          <input
                            type="number"
                            required
                            value={v.stock_quantity}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx].stock_quantity = parseFloat(e.target.value) || 0;
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600">Min Stock</label>
                          <input
                            type="number"
                            required
                            value={v.min_stock_level}
                            onChange={(e) => {
                              const updated = [...variantsForm];
                              updated[idx].min_stock_level = parseFloat(e.target.value) || 0;
                              setVariantsForm(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-colors"
                >
                  Save Product & Variants
                </button>
              </div>
            </form>
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
