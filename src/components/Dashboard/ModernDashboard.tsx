import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowRight,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  Users,
  Package,
  Printer,
  Truck,
  RotateCcw,
  Plus,
  ReceiptText,
  BellRing,
  MessageCircle,
  MessageSquare,
  TrendingUp,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  UserMinus,
  SlidersHorizontal,
  Banknote,
  CalendarClock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Customer } from '../../types';
import { DueAlertModal } from '../Customers/DueAlertModal';
import {
  buildDueReminderMessage,
  buildSmsUrl,
  buildWhatsAppUrl,
  isCustomerDueOverdue,
  wasAlertedToday,
} from '../../utils/dueAlerts';
import {
  buildSalesTrendSeries,
  exportDateRangeReportCsv,
  shiftIsoDate,
} from '../../utils/salesAnalytics';
import {
  isGeneralProductModuleEnabled,
  isMedicineModuleEnabled,
  isProductEnabled,
} from '../../utils/modules';

export const ModernDashboard: React.FC = () => {
  const {
    sales,
    purchases,
    expenses,
    products,
    customers,
    stockAdjustments,
    store,
    setActiveTab,
    cashSessions,
    customerDues,
    setPrintableReceipt,
    logDueAlert,
  } = useApp();

  const isBn = store.language === 'bn';
  const [productFilterTab, setProductFilterTab] = useState<'best_seller' | 'low_stock' | 'all'>('best_seller');
  const [alertTargetCustomer, setAlertTargetCustomer] = useState<Customer | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [reportStartDate, setReportStartDate] = useState<string>(() => shiftIsoDate(todayStr, -6));
  const [reportEndDate, setReportEndDate] = useState<string>(todayStr);
  const [activePresetDays, setActivePresetDays] = useState<7 | 14 | 30 | 'custom'>(7);
  const [showDateTable, setShowDateTable] = useState<boolean>(false);

  const normalizedStart = reportStartDate <= reportEndDate ? reportStartDate : reportEndDate;
  const normalizedEnd = reportStartDate <= reportEndDate ? reportEndDate : reportStartDate;

  const trendSeries = useMemo(
    () =>
      buildSalesTrendSeries({
        sales,
        expenses,
        startDate: normalizedStart,
        endDate: normalizedEnd,
      }),
    [sales, expenses, normalizedStart, normalizedEnd]
  );

  const rangeTotals = useMemo(
    () =>
      trendSeries.reduce(
        (acc, day) => ({
          sales: acc.sales + day.sales,
          paid: acc.paid + day.paid,
          due: acc.due + day.due,
          orders: acc.orders + day.orders,
          expenses: acc.expenses + day.expenses,
        }),
        { sales: 0, paid: 0, due: 0, orders: 0, expenses: 0 }
      ),
    [trendSeries]
  );

  const applyPresetRange = (days: 7 | 14 | 30) => {
    setActivePresetDays(days);
    setReportEndDate(todayStr);
    setReportStartDate(shiftIsoDate(todayStr, -(days - 1)));
  };

  const todaySales = sales.filter((s) => s.date === todayStr && s.status === 'completed');
  const todayTotal = todaySales.reduce((sum, s) => sum + s.grand_total, 0);

  const activeSession = cashSessions.find((s) => s.status === 'open');
  const currentCashSales = activeSession
    ? sales
        .filter(
          (s) =>
            s.status === 'completed' &&
            s.payment_method === 'cash' &&
            new Date(s.created_at).getTime() >= new Date(activeSession.start_time).getTime()
        )
        .reduce((sum, s) => sum + s.paid_amount, 0)
    : 0;

  const currentDueCollected = activeSession
    ? customerDues
        .filter(
          (d) =>
            d.type === 'due_payment' &&
            d.payment_method === 'cash' &&
            new Date(`${d.date}T${d.time}`).getTime() >= new Date(activeSession.start_time).getTime()
        )
        .reduce((sum, d) => sum + d.paid_amount, 0)
    : 0;

  const expectedDrawerBalance = activeSession
    ? activeSession.opening_cash + currentCashSales + currentDueCollected
    : 0;

  const medEnabled = isMedicineModuleEnabled(store);
  const genEnabled = isGeneralProductModuleEnabled(store);
  const anyProductModuleEnabled = medEnabled || genEnabled;

  const visibleProducts = useMemo(
    () => products.filter((p) => !p.archived && isProductEnabled(p, store)),
    [products, store]
  );

  const allVariants = useMemo(
    () =>
      visibleProducts.flatMap((p) =>
        p.variants
          .filter((v) => v.active)
          .map((v) => ({
            ...v,
            product_name: p.name,
            image: p.image,
            category_id: p.category_id,
          }))
      ),
    [visibleProducts]
  );

  const lowStockVariants = allVariants.filter((v) => v.stock_quantity <= v.min_stock_level);
  const totalCustomerDue = customers.reduce((sum, c) => sum + (c.total_due_amount || 0), 0);
  const pendingDuesCount = customers.filter((c) => c.total_due_amount > 0).length;

  const todayExpenses = expenses
    .filter((e) => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const todayGrossProfit = todaySales.reduce(
    (sum, s) =>
      sum +
      s.items.reduce(
        (iSum, item) =>
          iSum + ((item.unit_selling_price || 0) - (item.unit_purchase_price || 0)) * (item.quantity || 0),
        0
      ) -
      (s.discount_amount || 0),
    0
  );
  const todayNetProfit = Math.round((todayGrossProfit - todayExpenses) * 100) / 100;

  const expiringSoonCount = medEnabled
    ? allVariants.filter((v) => {
        if (!v.expiry_date) return false;
        const expTime = new Date(v.expiry_date).getTime();
        const limitTime = Date.now() + 90 * 24 * 60 * 60 * 1000;
        return expTime <= limitTime;
      }).length
    : 0;

  const currentMonthStr = todayStr.slice(0, 7);
  const enabledProductIdSet = new Set(visibleProducts.map((p) => p.id));
  const personalUseMonthCost = stockAdjustments
    .filter(
      (r) =>
        enabledProductIdSet.has(r.product_id) &&
        (r.adjustment_type === 'owner_personal_use' || r.adjustment_type === 'staff_personal_use') &&
        r.date.startsWith(currentMonthStr)
    )
    .reduce((sum, r) => sum + r.total_purchase_value, 0);

  const otherAdjustmentMonthCost = stockAdjustments
    .filter(
      (r) =>
        enabledProductIdSet.has(r.product_id) &&
        r.adjustment_type !== 'owner_personal_use' &&
        r.adjustment_type !== 'staff_personal_use' &&
        r.date.startsWith(currentMonthStr)
    )
    .reduce((sum, r) => sum + r.total_purchase_value, 0);

  const displayedVariants = useMemo(() => {
    if (productFilterTab === 'low_stock') {
      return lowStockVariants.slice(0, 8);
    }
    if (productFilterTab === 'all') {
      return allVariants.slice(0, 8);
    }
    return [...allVariants]
      .sort((a, b) => (b.image ? 1 : 0) - (a.image ? 1 : 0))
      .slice(0, 4);
  }, [allVariants, lowStockVariants, productFilterTab]);

  const catalogTab = anyProductModuleEnabled
    ? medEnabled && !genEnabled
      ? 'medicine'
      : !medEnabled && genEnabled
      ? 'general_products'
      : 'products'
    : 'settings';

  const kpiCards = [
    {
      title: isBn ? 'আজকের বিক্রয়' : "Today's Sales",
      subtitle: isBn ? `${todaySales.length}টি অর্ডার` : `${todaySales.length} Orders`,
      value: `${store.currency_symbol}${todayTotal.toLocaleString()}`,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      icon: ShoppingBag,
      tab: 'sales',
    },
    {
      title: isBn ? 'আজকের লাভ (নিট)' : "Today's Profit",
      subtitle: isBn ? `মোট ${sales.length} অর্ডার` : `${sales.length} Total Orders`,
      value: `${store.currency_symbol}${todayNetProfit.toLocaleString()}`,
      iconBg:
        todayNetProfit >= 0
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-rose-50 text-rose-600 border-rose-200',
      icon: TrendingUp,
      tab: 'reports',
    },
    {
      title: isBn ? 'আজকের খরচ' : "Today's Expenses",
      subtitle: activeSession
        ? `${store.currency_symbol}${expectedDrawerBalance.toLocaleString()} drawer`
        : isBn
        ? 'ক্যাশ ড্রয়ার'
        : 'Cash Drawer',
      value: `${store.currency_symbol}${todayExpenses.toLocaleString()}`,
      iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Banknote,
      tab: 'expenses',
    },
    {
      title: isBn ? 'কাস্টমার বাকি' : 'Total Customer Due',
      subtitle: isBn ? `${customers.length} কাস্টমার · ${pendingDuesCount} বাকি` : `${customers.length} Cust · ${pendingDuesCount} Due`,
      value: `${store.currency_symbol}${totalCustomerDue.toLocaleString()}`,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      icon: Users,
      tab: 'customer_due',
    },
    {
      title: isBn ? 'মোট পণ্য ও কম স্টক' : 'Products & Low Stock',
      subtitle:
        lowStockVariants.length > 0
          ? `${lowStockVariants.length} Low Stock`
          : isBn
          ? 'স্টক পর্যাপ্ত'
          : 'All Stock OK',
      value: anyProductModuleEnabled ? `${visibleProducts.length}` : 'OFF',
      iconBg:
        lowStockVariants.length > 0
          ? 'bg-amber-50 text-amber-600 border-amber-200'
          : 'bg-emerald-50 text-emerald-600 border-emerald-200',
      icon: lowStockVariants.length > 0 ? AlertTriangle : Package,
      tab: lowStockVariants.length > 0 ? 'inventory' : catalogTab,
    },
    ...(medEnabled
      ? [
          {
            title: isBn ? 'মেয়াদ সতর্কতা' : 'Expiry Alert (90D)',
            subtitle: expiringSoonCount > 0 ? 'Batch action needed' : 'All batches valid',
            value: `${expiringSoonCount}`,
            iconBg:
              expiringSoonCount > 0
                ? 'bg-orange-50 text-orange-600 border-orange-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200',
            icon: CalendarClock,
            tab: 'medicine',
          },
        ]
      : [
          {
            title: isBn ? 'ক্যাশ ড্রয়ার' : 'Cash Drawer',
            subtitle: activeSession ? (isBn ? 'শিফট চালু' : 'Active Shift') : isBn ? 'শিফট বন্ধ' : 'Closed',
            value: `${store.currency_symbol}${expectedDrawerBalance.toLocaleString()}`,
            iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: Wallet,
            tab: 'cash',
          },
        ]),
  ];

  return (
    <div className="p-3 sm:p-5 lg:p-6 bg-slate-50 min-h-full text-slate-800 space-y-5 max-w-[1440px] mx-auto">
      {/* 1. COMPACT STORE ACTION BAR (No oversized banner) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
            {store.store_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn
              ? 'দৈনিক বিক্রয়, স্টক, বাকি এবং রিপোর্ট সংক্ষিপ্ত চিত্র'
              : 'Daily sales summary, stock alerts, dues & quick counter actions'}
            {' · '}
            <span className="font-mono text-slate-600">{todayStr}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors min-h-[40px]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isBn ? 'POS চালু করুন' : 'Open POS'}</span>
          </button>
          {anyProductModuleEnabled && (
            <button
              type="button"
              onClick={() => setActiveTab(catalogTab)}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors min-h-[40px]"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'পণ্য ও ওষুধ' : 'Products'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className="hidden sm:inline-flex px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold items-center gap-1.5 cursor-pointer transition-colors min-h-[40px]"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>{isBn ? 'ক্রয়' : 'Purchase'}</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT KPI METRIC CARDS */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveTab(card.tab)}
              className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3.5 sm:p-4 text-left flex flex-col justify-between gap-2.5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500 truncate">
                  {card.title}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${card.iconBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 truncate">
                  {card.value}
                </span>
                <span className="text-[10px] font-medium text-slate-500 group-hover:text-emerald-600 truncate">
                  {card.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {/* 3. SALES TREND LINE CHART & DATE-TO-DATE REPORT */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {activePresetDays === 7
                  ? isBn
                    ? '৭ দিনের বিক্রয় ট্রেন্ড'
                    : '7-Day Sales Trend'
                  : activePresetDays === 'custom'
                  ? isBn
                    ? 'তারিখ অনুযায়ী বিক্রয়'
                    : 'Date-to-Date Sales Trend'
                  : `${activePresetDays}-Day Sales Trend`}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                {normalizedStart} → {normalizedEnd} ({trendSeries.length} days)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg text-[11px] font-semibold">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => applyPresetRange(days)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activePresetDays === days
                      ? 'bg-white text-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 max-w-full">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <input
                type="date"
                aria-label="From date"
                value={reportStartDate}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setReportStartDate(e.target.value);
                  setActivePresetDays('custom');
                }}
                className="bg-transparent text-[11px] font-mono text-slate-700 focus:outline-none w-[108px]"
              />
              <span className="text-slate-400 text-[11px]">→</span>
              <input
                type="date"
                aria-label="To date"
                value={reportEndDate}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setReportEndDate(e.target.value);
                  setActivePresetDays('custom');
                }}
                className="bg-transparent text-[11px] font-mono text-slate-700 focus:outline-none w-[108px]"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                exportDateRangeReportCsv({
                  points: trendSeries,
                  storeName: store.store_name,
                  startDate: normalizedStart,
                  endDate: normalizedEnd,
                  currencySymbol: store.currency_symbol,
                })
              }
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{isBn ? 'রিপোর্ট' : 'Reports'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] text-slate-500">Range Sales</div>
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-0.5">
              {store.currency_symbol}
              {rangeTotals.sales.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] text-slate-500">Collected Paid</div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 mt-0.5">
              {store.currency_symbol}
              {rangeTotals.paid.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] text-slate-500">Due Added</div>
            <div className="text-base sm:text-lg font-bold font-mono text-amber-600 mt-0.5">
              {store.currency_symbol}
              {rangeTotals.due.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] text-slate-500">Invoices</div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 mt-0.5">
              {rangeTotals.orders}
            </div>
          </div>
        </div>

        {/* Line Chart */}
        <div className="w-full h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendSeries} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                minTickGap={18}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(val: number) =>
                  `${store.currency_symbol}${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const point = payload[0]?.payload as (typeof trendSeries)[number] | undefined;
                  if (!point) return null;
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-md p-2.5 text-xs space-y-1 min-w-[165px]">
                      <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex justify-between gap-2">
                        <span className="font-mono">{point.date}</span>
                        <span className="text-slate-500">{point.orders} orders</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-600">Sales:</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {store.currency_symbol}
                          {point.sales.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-600">Paid:</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {store.currency_symbol}
                          {point.paid.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} iconType="circle" />
              <Line
                type="monotone"
                dataKey="sales"
                name={`Sales (${store.currency_symbol})`}
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#059669', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="paid"
                name={`Paid (${store.currency_symbol})`}
                stroke="#0f766e"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0f766e', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 4.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Toggleable Daily Breakdown */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowDateTable((prev) => !prev)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            {showDateTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>
              {showDateTable
                ? 'Hide Daily Breakdown'
                : `View Daily Breakdown (${trendSeries.length} Days)`}
            </span>
          </button>

          {showDateTable && (
            <>
              {/* Mobile Compact Cards */}
              <div className="md:hidden mt-3 space-y-2 max-h-72 overflow-y-auto">
                {[...trendSeries].reverse().map((row) => (
                  <div
                    key={row.date}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-800">{row.date}</div>
                      <div className="text-[11px] text-slate-500">{row.orders} orders</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-emerald-600">
                        {store.currency_symbol}
                        {row.sales.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Paid {store.currency_symbol}
                        {row.paid.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block mt-3 overflow-x-auto border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 text-center">Orders</th>
                      <th className="p-2.5 text-right">Sales</th>
                      <th className="p-2.5 text-right">Paid</th>
                      <th className="p-2.5 text-right">Due</th>
                      <th className="p-2.5 text-right">Expenses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {[...trendSeries].reverse().map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-800 font-semibold">{row.date}</td>
                        <td className="p-2.5 text-center text-slate-600">{row.orders}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">
                          {store.currency_symbol}
                          {row.sales.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-emerald-700">
                          {store.currency_symbol}
                          {row.paid.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-amber-700">
                          {store.currency_symbol}
                          {row.due.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-slate-600">
                          {store.currency_symbol}
                          {row.expenses.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. TWO-COLUMN OPERATIONAL STRIP: QUICK CATALOG + RECENT SALES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Quick Products / Low Stock */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              {isBn ? 'দ্রুত পণ্য তালিকা' : 'Quick Catalog'}
            </h3>
            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-semibold">
              {[
                { id: 'best_seller', label: isBn ? 'জনপ্রিয়' : 'Featured' },
                { id: 'low_stock', label: `Low (${lowStockVariants.length})` },
                { id: 'all', label: isBn ? 'সব' : 'All' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProductFilterTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    productFilterTab === tab.id
                      ? 'bg-white text-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {displayedVariants.map((variant) => {
              const isLow = variant.stock_quantity <= variant.min_stock_level;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-white text-left flex flex-col justify-between gap-1.5 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">
                      {variant.product_name}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                        isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200/70 text-slate-700'
                      }`}
                    >
                      {variant.stock_quantity} {variant.unit}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[11px] text-slate-500 truncate">
                      {variant.variant_name}
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-600 shrink-0">
                      {store.currency_symbol}
                      {variant.selling_price}
                    </span>
                  </div>
                </button>
              );
            })}
            {displayedVariants.length === 0 && (
              <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                No products available in this filter.
              </div>
            )}
          </div>
        </section>

        {/* Recent Sales Invoices */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ReceiptText className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'সাম্প্রতিক বিক্রয়' : 'Recent Invoices'}</span>
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('returns')}
                className="text-xs font-semibold text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isBn ? 'রিটার্ন' : 'Returns'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sales')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{isBn ? 'সব দেখুন' : 'All Sales'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {sales.slice(0, 5).map((sale) => {
              const cust = sale.customer_id
                ? customers.find((c) => c.id === sale.customer_id)
                : sale.customer_mobile
                ? customers.find((c) => c.mobile === sale.customer_mobile)
                : undefined;
              const isDueCleared =
                sale.due_amount > 0 && cust !== undefined && (cust.total_due_amount || 0) <= 0;
              return (
                <div
                  key={sale.id}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-emerald-600">
                        {sale.invoice_number}
                      </span>
                      {sale.due_amount > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isDueCleared
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isDueCleared
                            ? 'Due Cleared'
                            : `Due ${store.currency_symbol}${sale.due_amount}`}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {sale.customer_name} · {sale.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-mono font-bold text-slate-900">
                      {store.currency_symbol}
                      {sale.grand_total.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPrintableReceipt({ type: 'sale', data: sale })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {sales.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No sales yet. Open POS Terminal to complete your first sale.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 4B. PERSONAL USE, STOCK ADJUSTMENT SUMMARY & RECENT PURCHASES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Personal Use & Stock Loss Summary */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900">
              {isBn ? 'ব্যক্তিগত ব্যবহার ও স্টক সমন্বয়' : 'Personal Use & Stock Loss (Month)'}
            </h3>
            <span className="text-[10px] font-mono text-slate-500">{currentMonthStr}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('personal_use')}
              className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <UserMinus className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isBn ? 'ব্যক্তিগত ব্যবহার' : 'Personal Use'}</span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                {store.currency_symbol}
                {personalUseMonthCost.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Recorded at purchase cost</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stock_adjustment')}
              className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-left cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <SlidersHorizontal className="w-3.5 h-3.5 text-rose-600" />
                <span>{isBn ? 'ড্যামেজ ও সমন্বয়' : 'Adjustments & Loss'}</span>
              </div>
              <div className="text-base font-bold font-mono text-rose-700 mt-1">
                {store.currency_symbol}
                {otherAdjustmentMonthCost.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Damaged / Expired / Wastage</div>
            </button>
          </div>
        </section>

        {/* Recent Purchases */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'সাম্প্রতিক ক্রয়' : 'Recent Purchases'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('purchases')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{isBn ? 'সব দেখুন' : 'All Purchases'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {purchases.slice(0, 4).map((p) => (
              <div key={p.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-emerald-700">{p.purchase_number}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {p.supplier_name} · {p.purchase_date}
                  </div>
                </div>
                <div className="text-right font-mono shrink-0">
                  <div className="font-bold text-slate-900">
                    {store.currency_symbol}
                    {p.grand_total.toLocaleString()}
                  </div>
                  {p.due_amount > 0 && (
                    <div className="text-[10px] text-rose-600">
                      Due {store.currency_symbol}
                      {p.due_amount}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {purchases.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No purchase records yet.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 5. CUSTOMER DUE ALERTS STRIP */}
      {pendingDuesCount > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isBn
                    ? `বাকি কাস্টমার রিমাইন্ডার (${pendingDuesCount})`
                    : `Due Customer Alerts (${pendingDuesCount})`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isBn
                    ? 'এক ক্লিকে SMS, WhatsApp বা কল রিমাইন্ডার পাঠান'
                    : 'Send instant SMS, WhatsApp, Call or Email reminders'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('customer_due')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{isBn ? 'বাকি খাতা' : 'Due Ledger'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...customers]
              .filter((c) => (c.total_due_amount || 0) > 0)
              .sort((a, b) => (b.total_due_amount || 0) - (a.total_due_amount || 0))
              .slice(0, 6)
              .map((dc) => {
                const overdue = isCustomerDueOverdue(dc, store.due_alert_days || 7);
                const alerted = wasAlertedToday(dc);
                const quickMsg = buildDueReminderMessage({
                  customer: dc,
                  store,
                  lang: store.language === 'bn' ? 'bn' : 'both',
                });
                return (
                  <div
                    key={dc.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {dc.name}
                          </span>
                          {overdue.overdue && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                              OVERDUE
                            </span>
                          )}
                          {alerted && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                              Sent
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {dc.mobile}
                        </div>
                      </div>
                      <div className="text-sm font-bold font-mono text-rose-600 shrink-0">
                        {store.currency_symbol}
                        {dc.total_due_amount.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={buildWhatsAppUrl(dc.mobile, quickMsg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => logDueAlert(dc.id, 'whatsapp', 'Dashboard quick WhatsApp')}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                      <a
                        href={buildSmsUrl(dc.mobile, quickMsg)}
                        onClick={() => logDueAlert(dc.id, 'sms', 'Dashboard quick SMS')}
                        className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>SMS</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setAlertTargetCustomer(dc)}
                        className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        More
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {alertTargetCustomer && (
        <DueAlertModal
          customer={alertTargetCustomer}
          onClose={() => setAlertTargetCustomer(null)}
        />
      )}
    </div>
  );
};
