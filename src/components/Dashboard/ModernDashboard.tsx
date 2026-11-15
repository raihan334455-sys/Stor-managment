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
  ShieldCheck,
  Headphones,
  Star,
  Plus,
  ReceiptText,
  ScanBarcode,
  WifiOff,
  Store,
  BellRing,
  MessageCircle,
  MessageSquare,
  TrendingUp,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
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
    expenses,
    products,
    customers,
    store,
    setActiveTab,
    cashSessions,
    customerDues,
    setPrintableReceipt,
    logDueAlert,
  } = useApp();

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

  const displayedVariants = useMemo(() => {
    if (productFilterTab === 'low_stock') {
      return lowStockVariants.slice(0, 10);
    }
    if (productFilterTab === 'all') {
      return allVariants.slice(0, 10);
    }
    // Best Seller: prioritize items with photos or top stock movement
    return [...allVariants]
      .sort((a, b) => (b.image ? 1 : 0) - (a.image ? 1 : 0))
      .slice(0, 5);
  }, [allVariants, lowStockVariants, productFilterTab]);

  // 5 Pastel Category / Store Metric Cards matching reference image row
  const categoryCards = [
    {
      title: "Today's Sales",
      subtitle: `${todaySales.length} Orders`,
      value: `${store.currency_symbol}${todayTotal.toLocaleString()}`,
      cta: 'View Sales',
      bg: 'bg-[#fde6ee]',
      iconBg: 'bg-white/80 text-[#ec1f73]',
      icon: ShoppingBag,
      tab: 'sales',
    },
    {
      title: 'Drawer Cash',
      subtitle: activeSession ? 'Active Shift' : 'Shift Closed',
      value: `${store.currency_symbol}${expectedDrawerBalance.toLocaleString()}`,
      cta: 'Cash Drawer',
      bg: 'bg-[#dff0ff]',
      iconBg: 'bg-white/80 text-[#0284c7]',
      icon: Wallet,
      tab: 'cash',
    },
    {
      title: 'Low Stock',
      subtitle: 'Reorder Needed',
      value: `${lowStockVariants.length} Items`,
      cta: 'Restock Now',
      bg: 'bg-[#eef0f6]',
      iconBg: 'bg-white/80 text-[#5b46b5]',
      icon: AlertTriangle,
      tab: 'inventory',
    },
    {
      title: 'Customer Dues',
      subtitle: `${pendingDuesCount} Pending`,
      value: `${store.currency_symbol}${totalCustomerDue.toLocaleString()}`,
      cta: 'Collect Due',
      bg: 'bg-[#fef3c7]',
      iconBg: 'bg-white/80 text-[#d97706]',
      icon: Users,
      tab: 'customer_due',
    },
    {
      title: 'Catalog Items',
      subtitle: anyProductModuleEnabled ? `${allVariants.length} Variants` : 'Modules Closed',
      value: anyProductModuleEnabled ? `${visibleProducts.length} Products` : 'Disabled',
      cta: anyProductModuleEnabled ? 'Manage Catalog' : 'Settings',
      bg: 'bg-[#fce7f3]',
      iconBg: 'bg-white/80 text-[#db2777]',
      icon: Package,
      tab: anyProductModuleEnabled
        ? medEnabled && !genEnabled
          ? 'medicine'
          : !medEnabled && genEnabled
          ? 'general_products'
          : 'products'
        : 'settings',
    },
  ];

  const trustFeatures = [
    {
      title: '100% Offline Ready',
      desc: 'Zero internet required for billing',
      icon: WifiOff,
      circleBg: 'bg-[#ede9fe] text-[#5b46b5]',
    },
    {
      title: 'Thermal Receipts',
      desc: `${store.receipt_size} instant cash memo print`,
      icon: Printer,
      circleBg: 'bg-[#fce7f3] text-[#ec1f73]',
    },
    {
      title: 'Secure Access',
      desc: 'Salesman ID & Password control',
      icon: ShieldCheck,
      circleBg: 'bg-[#e0f2fe] text-[#0284c7]',
    },
    {
      title: 'Barcode & Scale',
      desc: 'Fast scanning & unit pricing',
      icon: ScanBarcode,
      circleBg: 'bg-[#fef3c7] text-[#d97706]',
    },
  ];

  const featuredHeroProduct = allVariants.find((v) => Boolean(v.image)) || allVariants[0];

  return (
    <div className="w-full bg-[#fafafc] text-[#1e1b3a]">
      {/* 1. LAVENDER GRADIENT HERO BANNER (Directly following reference top hero) */}
      <section className="w-full bg-gradient-to-r from-[#dcd4ff] via-[#e7e1ff] to-[#c7bdfc]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-semibold text-[#5b46b5] tracking-wide">
              Daily Store Operations
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1e1b3a] tracking-tight leading-[1.1] text-balance">
              Refresh Your{' '}
              <span className="text-[#ec1f73] block sm:inline">Grocery POS</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
              Manage daily counter checkout, track customer dues, print 58mm/80mm thermal receipts, and control salesman accounts — all offline.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('pos')}
                className="px-6 py-3 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white text-xs font-bold shadow-md shadow-[#ec1f73]/25 inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Open POS Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {anyProductModuleEnabled && (
                <button
                  onClick={() =>
                    setActiveTab(
                      medEnabled && !genEnabled
                        ? 'medicine'
                        : !medEnabled && genEnabled
                        ? 'general_products'
                        : 'products'
                    )
                  }
                  className="px-6 py-3 rounded-lg border border-slate-500/40 bg-white/50 hover:bg-white text-[#1e1b3a] text-xs font-bold transition-all cursor-pointer"
                >
                  Explore Products
                </button>
              )}
            </div>
          </div>

          {/* Right Hero Showcase */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl p-5 shadow-[0_20px_50px_-15px_rgba(91,70,181,0.22)] border border-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#ec1f73] text-white flex items-center justify-center overflow-hidden">
                    {store.store_logo ? (
                      <img src={store.store_logo} alt={store.store_name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1e1b3a]">{store.store_name}</div>
                    <div className="text-[11px] text-slate-400">Live Counter Summary</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#5b46b5]">
                  {todayStr}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#f7f7fb]">
                  <div className="text-[11px] text-slate-500">Today's Revenue</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-[#ec1f73] mt-0.5">
                    {store.currency_symbol}{todayTotal.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#f7f7fb]">
                  <div className="text-[11px] text-slate-500">Cash in Drawer</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-[#5b46b5] mt-0.5">
                    {store.currency_symbol}{expectedDrawerBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              {featuredHeroProduct && (
                <button
                  onClick={() => setActiveTab('pos')}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-100 hover:border-[#ec1f73]/40 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {featuredHeroProduct.image ? (
                      <img
                        src={featuredHeroProduct.image}
                        alt={featuredHeroProduct.product_name}
                        className="w-11 h-11 rounded-lg object-cover bg-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-pink-50 text-[#ec1f73] flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold text-[#1e1b3a] truncate group-hover:text-[#ec1f73]">
                        {featuredHeroProduct.product_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {featuredHeroProduct.variant_name} · {store.currency_symbol}
                        {featuredHeroProduct.selling_price}/{featuredHeroProduct.unit}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#ec1f73] shrink-0">Sell →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* 2. 5 PASTEL CATEGORY / METRIC CARDS ROW (Matching reference 5-card strip) */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categoryCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <button
                key={i}
                onClick={() => setActiveTab(card.tab)}
                className={`${card.bg} rounded-2xl p-4 sm:p-5 text-left flex flex-col justify-between min-h-[128px] hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">{card.subtitle}</div>
                    <h3 className="text-sm font-extrabold text-[#1e1b3a] uppercase tracking-wide mt-0.5">
                      {card.title}
                    </h3>
                  </div>
                  <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="pt-3 flex items-end justify-between gap-2">
                  <div className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-[#1e1b3a]">
                    {card.value}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 group-hover:text-[#ec1f73] whitespace-nowrap">
                    {card.cta} →
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        {/* 2B. 7-DAY SALES TREND LINE CHART & DATE-TO-DATE REPORT */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
          {/* Header & Date-to-Date Filter Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fde6ee] text-[#ec1f73] flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#1e1b3a] tracking-tight">
                  {activePresetDays === 7
                    ? '7-Day Sales Trend'
                    : activePresetDays === 'custom'
                    ? 'Date-to-Date Sales Trend'
                    : `${activePresetDays}-Day Sales Trend`}
                </h2>
                <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className="font-mono">{normalizedStart}</span>
                  <span>to</span>
                  <span className="font-mono">{normalizedEnd}</span>
                  <span aria-hidden="true">·</span>
                  <span>{trendSeries.length} days</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Day Presets */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
                {([7, 14, 30] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => applyPresetRange(days)}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activePresetDays === days
                        ? 'bg-white text-[#5b46b5] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>

              {/* Date-to-Date Pickers */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#5b46b5] shrink-0" />
                <input
                  type="date"
                  aria-label="From date"
                  value={reportStartDate}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setReportStartDate(e.target.value);
                    setActivePresetDays('custom');
                  }}
                  className="bg-transparent text-xs font-mono text-slate-700 focus:outline-none"
                />
                <span className="text-slate-400 text-xs">→</span>
                <input
                  type="date"
                  aria-label="To date"
                  value={reportEndDate}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setReportEndDate(e.target.value);
                    setActivePresetDays('custom');
                  }}
                  className="bg-transparent text-xs font-mono text-slate-700 focus:outline-none"
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
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#5b46b5]" />
                <span>CSV Report</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="px-3 py-2 rounded-xl bg-[#5b46b5] hover:bg-[#4a379c] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Full Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Selected Date-to-Date Range Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#fafafc] border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500">Range Sales Revenue</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-[#ec1f73] mt-0.5">
                {store.currency_symbol}
                {rangeTotals.sales.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Avg {store.currency_symbol}
                {trendSeries.length > 0
                  ? Math.round(rangeTotals.sales / trendSeries.length).toLocaleString()
                  : 0}
                /day
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fafafc] border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500">Paid Collected</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-[#5b46b5] mt-0.5">
                {store.currency_symbol}
                {rangeTotals.paid.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {rangeTotals.sales > 0
                  ? `${((rangeTotals.paid / rangeTotals.sales) * 100).toFixed(0)}% collected`
                  : '0% collected'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fafafc] border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500">Credit / Due Added</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-amber-600 mt-0.5">
                {store.currency_symbol}
                {rangeTotals.due.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Expenses: {store.currency_symbol}
                {rangeTotals.expenses.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fafafc] border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500">Completed Invoices</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-[#1e1b3a] mt-0.5">
                {rangeTotals.orders}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Avg Bill: {store.currency_symbol}
                {rangeTotals.orders > 0
                  ? Math.round(rangeTotals.sales / rangeTotals.orders).toLocaleString()
                  : 0}
              </div>
            </div>
          </div>

          {/* Recharts 7-Day / Date-to-Date Sales Trend Line Chart */}
          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendSeries}
                margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
              >
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
                  width={56}
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
                      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1.5 min-w-[180px]">
                        <div className="font-bold text-[#1e1b3a] border-b border-slate-100 pb-1 flex items-center justify-between gap-3">
                          <span className="font-mono">{point.date}</span>
                          <span className="text-[11px] text-slate-500">
                            {point.orders} orders
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-600">Sales Total:</span>
                          <span className="font-mono font-bold text-[#ec1f73]">
                            {store.currency_symbol}
                            {point.sales.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-600">Paid Collected:</span>
                          <span className="font-mono font-bold text-[#5b46b5]">
                            {store.currency_symbol}
                            {point.paid.toLocaleString()}
                          </span>
                        </div>
                        {point.due > 0 && (
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-600">Credit Due:</span>
                            <span className="font-mono font-bold text-amber-600">
                              {store.currency_symbol}
                              {point.due.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name={`Sales Revenue (${store.currency_symbol})`}
                  stroke="#ec1f73"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ec1f73', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#ec1f73', stroke: '#ffffff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="paid"
                  name={`Collected Paid (${store.currency_symbol})`}
                  stroke="#5b46b5"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#5b46b5', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 5, fill: '#5b46b5', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Toggleable Daily Breakdown Table for Date-to-Date Report */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowDateTable((prev) => !prev)}
              className="text-xs font-bold text-[#5b46b5] hover:text-[#ec1f73] inline-flex items-center gap-1.5 cursor-pointer"
            >
              {showDateTable ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span>
                {showDateTable
                  ? 'Hide Date-to-Date Daily Breakdown'
                  : `View Date-to-Date Daily Breakdown (${trendSeries.length} Days)`}
              </span>
            </button>

            {showDateTable && (
              <div className="mt-3 overflow-x-auto border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 text-center">Orders</th>
                      <th className="p-2.5 text-right">Sales Total</th>
                      <th className="p-2.5 text-right">Paid Collected</th>
                      <th className="p-2.5 text-right">Due Added</th>
                      <th className="p-2.5 text-right">Expenses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {[...trendSeries].reverse().map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-700 font-semibold">{row.date}</td>
                        <td className="p-2.5 text-center text-slate-600">{row.orders}</td>
                        <td className="p-2.5 text-right font-bold text-[#ec1f73]">
                          {store.currency_symbol}
                          {row.sales.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-[#5b46b5]">
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
            )}
          </div>
        </section>

        {/* 3. TRENDING PRODUCTS SHOWCASE (Matching reference section + segmented pills) */}
        <section className="space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e1b3a] tracking-tight">
              Trending Products
            </h2>

            {/* Segmented Filter Tabs */}
            <div className="inline-flex flex-wrap justify-center items-center gap-2">
              {[
                { id: 'best_seller', label: 'Best Seller' },
                { id: 'low_stock', label: `Low Stock (${lowStockVariants.length})` },
                { id: 'all', label: 'All Products' },
              ].map((tab) => {
                const active = productFilterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setProductFilterTab(tab.id as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#ec1f73] text-white shadow-sm shadow-[#ec1f73]/30'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-[#ec1f73]/40'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5-Column Clean Product Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {displayedVariants.map((variant) => {
              const isLow = variant.stock_quantity <= variant.min_stock_level;
              return (
                <div
                  key={variant.id}
                  onClick={() => setActiveTab('pos')}
                  className="bg-white rounded-2xl border border-slate-100 hover:border-[#ec1f73]/40 hover:shadow-lg transition-all overflow-hidden flex flex-col cursor-pointer group"
                >
                  {/* Neutral Product Stage */}
                  <div className="relative bg-[#f7f7fa] aspect-[4/3] w-full overflow-hidden flex items-center justify-center">
                    {variant.image ? (
                      <img
                        src={variant.image}
                        alt={variant.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-slate-300" />
                    )}

                    {/* Top-Left Hot Pink Badge */}
                    <span
                      className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                        isLow ? 'bg-amber-500' : 'bg-[#ec1f73]'
                      }`}
                    >
                      {isLow ? `Low: ${variant.stock_quantity}` : `${variant.stock_quantity} ${variant.unit}`}
                    </span>

                    {/* Top-Right Quick Add Circle */}
                    <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white text-slate-600 group-hover:bg-[#ec1f73] group-hover:text-white shadow-xs flex items-center justify-center transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-0.5 text-[#ec1f73] mb-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className="w-2.5 h-2.5 fill-current" />
                        ))}
                        <span className="text-[10px] text-slate-400 ml-1 font-mono">
                          {variant.variant_name}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-[#1e1b3a] line-clamp-1 group-hover:text-[#ec1f73] transition-colors">
                        {variant.product_name}
                      </h3>
                    </div>

                    <div className="pt-1 flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-[#ec1f73] font-mono tabular-nums">
                        {store.currency_symbol}{variant.selling_price}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        /{variant.unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. 4-COLUMN STORE HIGHLIGHTS STRIP (Matching reference white feature card) */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trustFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-full ${feat.circleBg} flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1e1b3a]">{feat.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* 4B. CUSTOMER DUE ALERTS STRIP (SMS / WHATSAPP / OTHER) */}
        {pendingDuesCount > 0 && (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#fde6ee] text-[#ec1f73] flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1e1b3a]">
                    Due Customer Alerts ({pendingDuesCount})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Send instant SMS, WhatsApp, Call or Email reminders for pending dues
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('customer_due')}
                className="text-xs font-bold text-[#5b46b5] hover:text-[#ec1f73] inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Due Ledger</span>
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
                      className="p-3.5 rounded-2xl bg-[#fafafc] border border-slate-200/80 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#1e1b3a] truncate">
                              {dc.name}
                            </span>
                            {overdue.overdue && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-extrabold">
                                OVERDUE
                              </span>
                            )}
                            {alerted && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                                Sent Today
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {dc.mobile}
                            {dc.due_promise_date ? ` · Due Date: ${dc.due_promise_date}` : ''}
                          </div>
                        </div>
                        <div className="text-sm font-extrabold font-mono text-[#ec1f73] shrink-0">
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
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={buildSmsUrl(dc.mobile, quickMsg)}
                          onClick={() => logDueAlert(dc.id, 'sms', 'Dashboard quick SMS')}
                          className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setAlertTargetCustomer(dc)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#5b46b5] hover:bg-[#4b389b] text-white text-[11px] font-bold cursor-pointer"
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

        {/* 5. WARM PEACH LOWER PROMOTIONAL BANNER + RECENT INVOICES */}
        <section className="rounded-2xl bg-gradient-to-r from-[#ffd8cc] via-[#ffe4db] to-[#ffcbb9] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-3">
            <p className="text-xs font-semibold text-[#ec1f73]">Recent Activity & Stock</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1e1b3a] tracking-tight leading-tight">
              Recent Sales{' '}
              <span className="text-[#ec1f73] block sm:inline">Just For You</span>
            </h2>
            <p className="text-xs text-slate-700 max-w-md leading-relaxed">
              Reprint 58mm or 80mm thermal receipts, check supplier inward purchases, or inspect daily sales reports in one click.
            </p>
            <div className="pt-1 flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('sales')}
                className="px-5 py-2.5 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white text-xs font-bold shadow-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>All Sales & Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTab('purchases')}
                className="px-5 py-2.5 rounded-lg bg-white/80 hover:bg-white text-[#1e1b3a] text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5 text-[#5b46b5]" />
                <span>Stock Purchase</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-[#1e1b3a] flex items-center gap-1.5">
                <ReceiptText className="w-4 h-4 text-[#ec1f73]" />
                <span>Latest Invoices</span>
              </span>
              <button
                onClick={() => setActiveTab('returns')}
                className="text-[11px] font-semibold text-[#5b46b5] hover:text-[#ec1f73] inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Returns</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {sales.slice(0, 4).map((sale) => {
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
                    className="py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#5b46b5] truncate">
                          {sale.invoice_number}
                        </span>
                        {sale.due_amount > 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isDueCleared
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-100 text-rose-700'
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
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-bold tabular-nums text-[#1e1b3a]">
                        {store.currency_symbol}{sale.grand_total.toLocaleString()}
                      </span>
                      <button
                        onClick={() => setPrintableReceipt({ type: 'sale', data: sale })}
                        className="px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-[#ec1f73] text-[#ec1f73] hover:text-white font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {sales.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No sales yet. Open POS Terminal to complete your first sale.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {alertTargetCustomer && (
        <DueAlertModal
          customer={alertTargetCustomer}
          onClose={() => setAlertTargetCustomer(null)}
        />
      )}
    </div>
  );
};
