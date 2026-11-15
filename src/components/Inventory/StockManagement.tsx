import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boxes,
  Search,
  AlertTriangle,
  Sliders,
  Calendar,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Flame,
  X,
} from 'lucide-react';
import { ProductVariant } from '../../types';
import { isMedicineModuleEnabled, isProductEnabled } from '../../utils/modules';

export const StockManagement: React.FC = () => {
  const {
    products,
    stockTransactions,
    stockTransfers,
    store,
    adjustStock,
    recordStockIn,
    recordStockOut,
    recordDamageStock,
    recordStockTransfer,
  } = useApp();

  const [subTab, setSubTab] = useState<'overview' | 'history' | 'transfers'>('overview');
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out' | 'expiring'>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');

  // Adjustment Modal
  const [showAdjModal, setShowAdjModal] = useState<boolean>(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [newStockVal, setNewStockVal] = useState<string>('0');
  const [adjReason, setAdjReason] = useState<string>('Physical Count Adjustment');

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

  const medEnabled = isMedicineModuleEnabled(store);
  const enabledProducts = products.filter((p) => !p.archived && isProductEnabled(p, store));
  const disabledProductIds = new Set(
    products.filter((p) => !isProductEnabled(p, store)).map((p) => p.id)
  );

  useEffect(() => {
    if (!medEnabled && filterType === 'expiring') {
      setFilterType('all');
    }
  }, [medEnabled, filterType]);

  // Extract all variants flat (scoped to active modules)
  const allVariants = enabledProducts.flatMap((p) =>
    p.variants.map((v) => ({
      ...v,
      product_name: p.name,
      code: p.code,
      generic_name: p.generic_name,
      company_name: p.company_name,
      strength: v.strength || p.strength,
      rack_number: p.rack_number,
      product_active: p.active !== false,
    }))
  );

  const visibleStockTransactions = stockTransactions.filter(
    (tx) => !disabledProductIds.has(tx.product_id)
  );
  const visibleStockTransfers = stockTransfers.filter(
    (tr) => !disabledProductIds.has(tr.product_id)
  );

  const lowStockCount = allVariants.filter(
    (v) => v.stock_quantity > 0 && v.stock_quantity <= v.min_stock_level
  ).length;
  const outOfStockCount = allVariants.filter((v) => v.stock_quantity <= 0).length;

  const filteredVariants = allVariants.filter((v) => {
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

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Page Title & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Boxes className="w-6 h-6 text-blue-600" />
            <span>Inventory & Stock Management</span>
          </h1>
          <p className="text-xs text-slate-500">
            All stock, Stock In, Stock Out, Low/Out of Stock, Damage write-offs, Stock Transfer & Stock History ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openMovement('stock_in')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Stock In</span>
          </button>
          <button
            type="button"
            onClick={() => openMovement('stock_out')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Stock Out</span>
          </button>
          <button
            type="button"
            onClick={() => openMovement('damage')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Damage Stock</span>
          </button>
          <button
            type="button"
            onClick={handleOpenTransfer}
            className="px-3.5 py-2 bg-[#5b46b5] hover:bg-[#4a379c] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Stock Transfer</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            subTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Live Stock ({allVariants.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
            subTab === 'history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Stock History ({visibleStockTransactions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('transfers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
            subTab === 'transfers'
              ? 'bg-[#5b46b5] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Stock Transfers ({visibleStockTransfers.length})</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              medEnabled
                ? 'Search stock by product, generic, company, rack, batch, SKU, barcode...'
                : 'Search stock by product, rack, SKU, barcode...'
            }
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>

        {subTab === 'overview' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
              }`}
            >
              All Stock ({allVariants.length})
            </button>
            <button
              onClick={() => setFilterType('low')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                filterType === 'low'
                  ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-amber-700 hover:bg-amber-50 shadow-sm'
              }`}
            >
              Low Stock ({lowStockCount})
            </button>
            <button
              onClick={() => setFilterType('out')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                filterType === 'out'
                  ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50 shadow-sm'
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
            {medEnabled && (
              <button
                onClick={() => setFilterType('expiring')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  filterType === 'expiring'
                    ? 'bg-orange-600 border-orange-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-orange-700 hover:bg-orange-50 shadow-sm'
                }`}
              >
                Expiring Soon
              </button>
            )}
          </div>
        )}

        {subTab === 'history' && (
          <select
            value={historyTypeFilter}
            onChange={(e) => setHistoryTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm"
          >
            <option value="all">All Movement Types</option>
            <option value="stock_in">Stock In</option>
            <option value="stock_out">Stock Out</option>
            <option value="purchase">Purchase Inward</option>
            <option value="sale">POS Sale</option>
            <option value="damage">Damage / Wastage</option>
            <option value="adjustment">Stock Adjustment</option>
            <option value="transfer">Stock Transfer</option>
            <option value="customer_return">Customer Return</option>
            <option value="supplier_return">Supplier Return</option>
          </select>
        )}
      </div>

      {/* SUB-TAB 1: LIVE STOCK TABLE */}
      {subTab === 'overview' && (
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
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {v.strength}
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
                          {medEnabled && v.generic_name ? ` • ${v.generic_name}` : ''}
                          {v.rack_number ? ` • Rack: ${v.rack_number}` : ''}
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
                          onClick={() => handleOpenAdjust(v)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-blue-600" />
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

      {/* SUB-TAB 2: STOCK HISTORY LEDGER */}
      {subTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
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
                        <span className="font-mono text-[10px] text-blue-600 block">
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

      {/* SUB-TAB 3: STOCK TRANSFERS */}
      {subTab === 'transfers' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
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
                    <td className="p-3.5 font-mono font-bold text-[#5b46b5]">{tr.transfer_number}</td>
                    <td className="p-3.5 font-mono text-slate-500">{tr.date}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{tr.product_name}</div>
                      <div className="text-[11px] text-slate-500">{tr.variant_name}</div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold">
                      {tr.quantity} {tr.unit}
                    </td>
                    <td className="p-3.5 text-slate-700">{tr.from_location}</td>
                    <td className="p-3.5 font-semibold text-blue-700">{tr.to_location}</td>
                    <td className="p-3.5 text-slate-500">{tr.transferred_by}</td>
                  </tr>
                ))}
                {visibleStockTransfers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No stock transfers recorded yet. Click "Stock Transfer" above to move stock between shelves, racks, or branches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* STOCK IN / STOCK OUT / DAMAGE MODAL */}
      {movementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-2xl space-y-4">
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
              <button onClick={() => setMovementModal(null)} className="text-slate-400 hover:text-slate-700">
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
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-[#5b46b5]" />
                <span>Stock Transfer</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-700">
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
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5b46b5] hover:bg-[#4a379c] text-white rounded-xl text-xs font-bold cursor-pointer"
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

