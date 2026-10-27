import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Percent,
} from 'lucide-react';

export const ReportsManagement: React.FC = () => {
  const { sales, expenses, products, customers, store } = useApp();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('all');

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayStr.slice(0, 7);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  // Filter sales & expenses
  const filteredSales = sales.filter((s) => {
    if (s.status !== 'completed') return false;
    if (dateFilter === 'today') return s.date === todayStr;
    if (dateFilter === '7days') return s.date >= sevenDaysAgoStr;
    if (dateFilter === 'month') return s.date.startsWith(monthPrefix);
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (dateFilter === 'today') return e.date === todayStr;
    if (dateFilter === '7days') return e.date >= sevenDaysAgoStr;
    if (dateFilter === 'month') return e.date.startsWith(monthPrefix);
    return true;
  });

  // Financial calculations
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);

  // COGS calculation
  const totalCOGS = filteredSales.reduce((sum, s) => {
    const saleCOGS = s.items.reduce(
      (acc, item) => acc + (item.unit_purchase_price || item.unit_selling_price * 0.75) * item.quantity,
      0
    );
    return sum + saleCOGS;
  }, 0);

  const grossProfit = Math.max(0, totalRevenue - totalCOGS);
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

  const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalOperatingExpenses;
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Payment Breakdown
  const paymentMethodTotals: { [key: string]: number } = {};
  filteredSales.forEach((s) => {
    const m = s.payment_method || 'cash';
    paymentMethodTotals[m] = (paymentMethodTotals[m] || 0) + s.paid_amount;
  });

  // Top Products
  const productSalesMap: {
    [key: string]: { name: string; qty: number; revenue: number; profit: number };
  } = {};

  filteredSales.forEach((s) => {
    s.items.forEach((item) => {
      const key = item.variant_id || item.product_name;
      if (!productSalesMap[key]) {
        productSalesMap[key] = {
          name: `${item.product_name} (${item.variant_name})`,
          qty: 0,
          revenue: 0,
          profit: 0,
        };
      }
      const cogs = (item.unit_purchase_price || item.unit_selling_price * 0.75) * item.quantity;
      productSalesMap[key].qty += item.quantity;
      productSalesMap[key].revenue += item.total_price;
      productSalesMap[key].profit += item.total_price - cogs;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Inventory valuation
  const allVariants = products.flatMap((p) => p.variants);
  const inventoryCostValue = allVariants.reduce(
    (sum, v) => sum + v.stock_quantity * v.purchase_price,
    0
  );
  const inventoryRetailValue = allVariants.reduce(
    (sum, v) => sum + v.stock_quantity * v.selling_price,
    0
  );
  const projectedInventoryProfit = inventoryRetailValue - inventoryCostValue;

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Reports & Comprehensive Profit / Loss Analytics</span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-time financial statement, item-wise margin analysis, and stock asset valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex text-xs font-semibold shadow-sm">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7days', label: 'Last 7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                onClick={() => setDateFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateFilter === btn.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* P&L Statement Master Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Gross Sales Revenue
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {store.currency_symbol}
            {totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>{filteredSales.length} Invoices</span>
            <span className="text-blue-600 font-semibold">100% Base</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Cost of Goods Sold (COGS)
          </span>
          <div className="text-2xl font-bold font-mono text-slate-700 mt-2">
            {store.currency_symbol}
            {totalCOGS.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Wholesale Sourcing Cost</span>
            <span className="font-mono text-slate-600">
              {totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>

        <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl shadow-sm">
          <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block">
            Gross Profit (Revenue - COGS)
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
            {store.currency_symbol}
            {grossProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-800 mt-2 flex items-center justify-between">
            <span className="font-semibold">Gross Margin:</span>
            <span className="font-mono font-bold text-emerald-700">{grossMargin}%</span>
          </div>
        </div>

        <div
          className={`p-5 rounded-2xl shadow-sm border ${
            netProfit >= 0
              ? 'bg-blue-50/60 border-blue-200'
              : 'bg-rose-50/60 border-rose-200'
          }`}
        >
          <span
            className={`text-xs font-bold uppercase tracking-wider block ${
              netProfit >= 0 ? 'text-blue-800' : 'text-rose-800'
            }`}
          >
            Net Bottom-Line Profit
          </span>
          <div
            className={`text-2xl font-bold font-mono mt-2 ${
              netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
            }`}
          >
            {store.currency_symbol}
            {netProfit.toLocaleString()}
          </div>
          <div className="text-[11px] mt-2 flex items-center justify-between">
            <span className="text-slate-600">After ৳{totalOperatingExpenses.toLocaleString()} Expenses:</span>
            <span className="font-mono font-bold">{netMargin}% Net</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Top Items & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Top 10 High-Revenue & Profitable Items</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Ranked by Sales</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                  <th className="p-2.5">PRODUCT VARIANT</th>
                  <th className="p-2.5 text-center">QTY SOLD</th>
                  <th className="p-2.5 text-right">REVENUE</th>
                  <th className="p-2.5 text-right">GROSS PROFIT</th>
                  <th className="p-2.5 text-center">MARGIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p, idx) => {
                  const marginPct = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0';
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium text-slate-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 font-mono text-[10px] flex items-center justify-center font-bold text-slate-600">
                          {idx + 1}
                        </span>
                        <span>{p.name}</span>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-700">{p.qty}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {store.currency_symbol}
                        {p.revenue.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                        {store.currency_symbol}
                        {p.profit.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {marginPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No sales data recorded for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Channels & Due Breakdown */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Payment Channels Breakdown</span>
            </h3>

            <div className="space-y-3">
              {Object.entries(paymentMethodTotals).map(([method, amount]) => {
                const pct = totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : '0';
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="uppercase text-slate-700">{method}</span>
                      <span className="font-mono text-slate-900">
                        {store.currency_symbol}
                        {amount.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {Object.keys(paymentMethodTotals).length === 0 && (
                <div className="text-center text-slate-400 text-xs py-4">No receipts recorded.</div>
              )}
            </div>
          </div>

          {/* Current Inventory Valuation Asset Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-400" />
              <span>Current Stock Asset Valuation</span>
            </h3>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Sourcing Cost:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {store.currency_symbol}
                  {inventoryCostValue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Potential Retail Value:</span>
                <span className="font-mono font-bold text-white">
                  {store.currency_symbol}
                  {inventoryRetailValue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Projected Margin:</span>
                <span className="font-mono font-bold text-blue-400">
                  +{store.currency_symbol}
                  {projectedInventoryProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
