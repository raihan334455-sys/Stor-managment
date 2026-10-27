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
} from 'lucide-react';
import { Product, ProductVariant, UnitType } from '../../types';

export const ProductManagement: React.FC = () => {
  const { products, categories, suppliers, store, saveProduct, archiveProduct } = useApp();
  const [search, setSearch] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Modal State
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSimilarMode, setIsSimilarMode] = useState<boolean>(false);
  const [clonedFromTitle, setClonedFromTitle] = useState<string>('');

  // Form State
  const [prodName, setProdName] = useState<string>('');
  const [prodCode, setProdCode] = useState<string>('');
  const [prodCat, setProdCat] = useState<string>('');
  const [prodDesc, setProdDesc] = useState<string>('');

  // Variants Form State
  const [variantsForm, setVariantsForm] = useState<
    Omit<ProductVariant, 'id' | 'product_id' | 'created_at' | 'updated_at' | 'sync_status' | 'branch_id' | 'device_id'>[]
  >([]);

  // Barcode Label Print Modal State
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState<boolean>(false);
  const [selectedVariantForBarcode, setSelectedVariantForBarcode] = useState<ProductVariant | null>(null);
  const [labelQty, setLabelQty] = useState<number>(10);

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

  const openAddModal = () => {
    setEditingProduct(null);
    setIsSimilarMode(false);
    setClonedFromTitle('');
    setProdName('');
    setProdCode(`PRD-${Date.now().toString().slice(-4)}`);
    setProdCat(categories[0]?.id || '');
    setProdDesc('');
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
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
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
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product & Variants</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Product Name, Code, Barcode or SKU..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 shrink-0 shadow-sm"
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
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedProductId(isExpanded ? null : p.id)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-sm border border-blue-100">
                      {p.name.charAt(0)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-800">{p.name}</h3>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {p.code}
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium">
                          {categoryName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {p.variants.length} Variant(s) Available
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
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

                      <div className="grid grid-cols-3 gap-2">
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

                      <div className="grid grid-cols-4 gap-2">
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

      {/* BARCODE LABEL PRINT MODAL */}
      {showBarcodePrintModal && selectedVariantForBarcode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Barcode className="w-4 h-4 text-blue-600" />
                <span>Print Barcode Label</span>
              </h3>
              <button
                onClick={() => setShowBarcodePrintModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 p-4 bg-white text-black rounded-xl text-center font-mono border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold tracking-wider">{store.store_name}</p>
              <p className="text-xs font-bold">{selectedVariantForBarcode.variant_name}</p>
              <div className="my-2 text-xl font-bold tracking-widest border-y border-black py-1">
                |||| | ||||| |||| |
              </div>
              <p className="text-[10px]">{selectedVariantForBarcode.barcode}</p>
              <p className="text-xs font-bold mt-1">
                PRICE: {store.currency_symbol}
                {selectedVariantForBarcode.selling_price}
              </p>
            </div>

            <button
              onClick={() => {
                window.print();
                setShowBarcodePrintModal(false);
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Barcode Labels</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
