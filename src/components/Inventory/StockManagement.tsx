import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boxes,
  Search,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Calendar,
  Layers,
  CheckCircle,
  X,
  History,
  TrendingDown,
} from 'lucide-react';
import { ProductVariant } from '../../types';

export const StockManagement: React.FC = () => {
  const { products, stockTransactions, store, adjustStock } = useApp();
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'expiring'>('all');

  // Adjustment Modal
  const [showAdjModal, setShowAdjModal] = useState<boolean>(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [newStockVal, setNewStockVal] = useState<string>('0');
  const [adjReason, setAdjReason] = useState<string>('Physical Count Adjustment');

  // Extract all variants flat
  const allVariants = products.flatMap((p) =>
    p.variants.map((v) => ({
      ...v,
      product_name: p.name,
      code: p.code,
    }))
  );

  const filteredVariants = allVariants.filter((v) => {
    const isLow = v.stock_quantity <= v.min_stock_level;
    const isExpiring = Boolean(v.expiry_date && new Date(v.expiry_date) <= new Date('2026-09-30'));

    if (filterType === 'low' && !isLow) return false;
    if (filterType === 'expiring' && !isExpiring) return false;

    const q = search.toLowerCase();
    return (
      !q ||
      v.product_name.toLowerCase().includes(q) ||
      v.variant_name.toLowerCase().includes(q) ||
      v.barcode.includes(q) ||
      v.sku.toLowerCase().includes(q)
    );
  });

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

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Boxes className="w-6 h-6 text-blue-600" />
            <span>Inventory & Stock Management</span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-time stock valuation, physical stock count audits, low stock alerts, and expiry tracking.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variant stock by product, SKU, barcode..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filterType === 'all'
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
            }`}
          >
            All Items ({allVariants.length})
          </button>
          <button
            onClick={() => setFilterType('low')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filterType === 'low'
                ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50 shadow-sm'
            }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setFilterType('expiring')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filterType === 'expiring'
                ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-amber-600 hover:bg-amber-50 shadow-sm'
            }`}
          >
            Expiring Soon
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] bg-slate-50 font-semibold uppercase">
                <th className="p-3.5">PRODUCT & VARIANT</th>
                <th className="p-3.5">SKU / BARCODE</th>
                <th className="p-3.5 text-right">PURCHASE PRICE</th>
                <th className="p-3.5 text-right">SELLING PRICE</th>
                <th className="p-3.5 text-center">CURRENT STOCK</th>
                <th className="p-3.5">BATCH & EXPIRY</th>
                <th className="p-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVariants.map((v) => {
                const isLow = v.stock_quantity <= v.min_stock_level;

                return (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{v.product_name}</div>
                      <div className="text-[11px] text-slate-500">{v.variant_name}</div>
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
                          isLow
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {v.stock_quantity} {v.unit}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {v.expiry_date ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span>{v.expiry_date}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenAdjust(v)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 shadow-sm transition-colors"
                      >
                        <Sliders className="w-3.5 h-3.5 text-blue-600" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUSTMENT MODAL */}
      {showAdjModal && selectedVariant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Sliders className="w-5 h-5 text-blue-600" />
                <span>Adjust Stock Quantity</span>
              </h3>
              <button
                onClick={() => setShowAdjModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
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
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-center text-2xl font-mono text-blue-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Adjustment *</label>
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
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-colors"
                >
                  Confirm Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
