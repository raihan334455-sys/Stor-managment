import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  Package,
  Calendar,
  CreditCard,
  Printer,
  ShieldAlert,
  ShoppingCart,
  Download,
  Pill,
  Truck,
  Users,
  AlertTriangle,
  Wallet,
  UserCheck,
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
import {
  buildSalesTrendSeries,
  exportDateRangeReportCsv,
  shiftIsoDate,
} from '../../utils/salesAnalytics';
import {
  isGeneralProductModuleEnabled,
  isMedicineModuleEnabled,
  isMedicineProduct,
  isProductEnabled,
} from '../../utils/modules';

type ReportTabId =
  | 'sales_pl'
  | 'purchase'
  | 'medicine'
  | 'general_product'
  | 'stock'
  | 'expiry'
  | 'customer_due'
  | 'supplier_due'
  | 'income_expense'
  | 'employee';

export const ReportsManagement: React.FC = () => {
  const {
    sales,
    purchases,
    expenses,
    incomes,
    products,
    categories,
    customers,
    suppliers,
    employees,
    attendance,
    salaries,
    store,
    activeUser,
    setActiveTab,
  } = useApp();

  const medEnabled = isMedicineModuleEnabled(store);
  const genEnabled = isGeneralProductModuleEnabled(store);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayStr.slice(0, 7);
  const sevenDaysAgoStr = shiftIsoDate(todayStr, -6);

  const [reportTab, setReportTab] = useState<ReportTabId>('sales_pl');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all' | 'custom'>('all');
  const [fromDate, setFromDate] = useState<string>(sevenDaysAgoStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  useEffect(() => {
    if (
      (!medEnabled && (reportTab === 'medicine' || reportTab === 'expiry')) ||
      (!genEnabled && reportTab === 'general_product')
    ) {
      setReportTab('sales_pl');
    }
  }, [medEnabled, genEnabled, reportTab]);

  const normalizedFrom = fromDate <= toDate ? fromDate : toDate;
  const normalizedTo = fromDate <= toDate ? toDate : fromDate;

  const matchesDateRange = (dateStr: string | undefined) => {
    if (!dateStr) return dateFilter === 'all';
    if (dateFilter === 'today') return dateStr === todayStr;
    if (dateFilter === '7days') return dateStr >= sevenDaysAgoStr;
    if (dateFilter === 'month') return dateStr.startsWith(monthPrefix);
    if (dateFilter === 'custom') return dateStr >= normalizedFrom && dateStr <= normalizedTo;
    return true;
  };

  const chartRange = useMemo(() => {
    if (dateFilter === 'today') return { start: todayStr, end: todayStr };
    if (dateFilter === '7days') return { start: sevenDaysAgoStr, end: todayStr };
    if (dateFilter === 'month') return { start: `${monthPrefix}-01`, end: todayStr };
    if (dateFilter === 'custom') return { start: normalizedFrom, end: normalizedTo };
    const completedDates = sales
      .filter((s) => s.status === 'completed' && s.date)
      .map((s) => s.date)
      .sort();
    const earliest = completedDates[0];
    const thirtyAgo = shiftIsoDate(todayStr, -29);
    const start = earliest && earliest > thirtyAgo ? earliest : thirtyAgo;
    return { start, end: todayStr };
  }, [dateFilter, todayStr, sevenDaysAgoStr, monthPrefix, normalizedFrom, normalizedTo, sales]);

  const trendSeries = useMemo(
    () =>
      buildSalesTrendSeries({
        sales,
        expenses,
        startDate: chartRange.start,
        endDate: chartRange.end,
      }),
    [sales, expenses, chartRange]
  );

  if (activeUser?.role === 'visitor') {
    return (
      <div className="p-8 max-w-lg mx-auto my-16 text-center bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800">অ্যাক্সেস সংরক্ষিত (Access Restricted)</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            ভিজিটর অ্যাকাউন্টে রিপোর্টস ও লাভ-ক্ষতি (Reports & Profit/Loss) দেখার অনুমতি নেই। কেবল অ্যাডমিন এই ডেটা দেখতে পারবেন।
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => setActiveTab('pos')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>পিওএস টার্মিনালে ফিরে যান (Return to POS)</span>
          </button>
        </div>
      </div>
    );
  }

  // Filter sales, purchases, expenses, incomes
  const filteredSales = sales.filter((s) => s.status === 'completed' && matchesDateRange(s.date));
  const filteredPurchases = purchases.filter((p) => matchesDateRange(p.purchase_date));
  const filteredExpenses = expenses.filter((e) => matchesDateRange(e.date));
  const filteredIncomes = incomes.filter((i) => matchesDateRange(i.date));

  // Financial calculations
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);
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

  const paymentMethodTotals: { [key: string]: number } = {};
  filteredSales.forEach((s) => {
    const m = s.payment_method || 'cash';
    paymentMethodTotals[m] = (paymentMethodTotals[m] || 0) + s.paid_amount;
  });

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

  const enabledProducts = products.filter((p) => !p.archived && isProductEnabled(p, store));
  const allVariants = enabledProducts.flatMap((p) => p.variants);
  const inventoryCostValue = allVariants.reduce(
    (sum, v) => sum + v.stock_quantity * v.purchase_price,
    0
  );
  const inventoryRetailValue = allVariants.reduce(
    (sum, v) => sum + v.stock_quantity * v.selling_price,
    0
  );
  const projectedInventoryProfit = inventoryRetailValue - inventoryCostValue;

  // Derived collections for specific reports
  const medicineProducts = medEnabled
    ? products.filter((p) => !p.archived && isMedicineProduct(p))
    : [];
  const generalProducts = genEnabled
    ? products.filter((p) => !p.archived && !isMedicineProduct(p))
    : [];

  const expiryVariants = medEnabled
    ? medicineProducts
        .flatMap((p) =>
          p.variants
            .filter((v) => Boolean(v.expiry_date))
            .map((v) => {
              const daysLeft = Math.ceil(
                (new Date(v.expiry_date!).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
              );
              return {
                productName: p.name,
                variantName: v.variant_name,
                batch: v.batch_number || '-',
                expiryDate: v.expiry_date!,
                stock: v.stock_quantity,
                unit: v.unit,
                value: v.stock_quantity * v.purchase_price,
                daysLeft,
              };
            })
        )
        .sort((a, b) => a.daysLeft - b.daysLeft)
    : [];

  const dueCustomersList = customers.filter((c) => (c.total_due_amount || 0) > 0);
  const dueSuppliersList = suppliers.filter((s) => (s.total_due || 0) > 0);

  const downloadGenericCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCurrentReport = () => {
    if (reportTab === 'sales_pl') {
      exportDateRangeReportCsv({
        points: trendSeries,
        storeName: store.store_name,
        startDate: chartRange.start,
        endDate: chartRange.end,
        currencySymbol: store.currency_symbol,
      });
      return;
    }
    if (reportTab === 'purchase') {
      downloadGenericCsv(
        'purchase_report',
        ['Purchase No', 'Date', 'Supplier', 'Grand Total', 'Paid', 'Due', 'Method'],
        filteredPurchases.map((p) => [
          p.purchase_number,
          p.purchase_date,
          p.supplier_name,
          p.grand_total,
          p.paid_amount,
          p.due_amount,
          p.payment_method,
        ])
      );
    } else if (reportTab === 'medicine' || reportTab === 'general_product' || reportTab === 'stock') {
      const src =
        reportTab === 'medicine'
          ? medicineProducts
          : reportTab === 'general_product'
          ? generalProducts
          : enabledProducts;
      downloadGenericCsv(
        `${reportTab}_report`,
        ['Code', 'Name', 'Generic/Brand', 'Variant', 'Stock', 'Unit', 'Purchase Price', 'Sale Price'],
        src.flatMap((p) =>
          p.variants.map((v) => [
            p.code,
            p.name,
            p.generic_name || p.brand_name || '-',
            v.variant_name,
            v.stock_quantity,
            v.unit,
            v.purchase_price,
            v.selling_price,
          ])
        )
      );
    } else if (reportTab === 'expiry') {
      downloadGenericCsv(
        'expiry_report',
        ['Product', 'Variant', 'Batch', 'Expiry Date', 'Days Left', 'Stock', 'Cost Value'],
        expiryVariants.map((e) => [
          e.productName,
          e.variantName,
          e.batch,
          e.expiryDate,
          e.daysLeft,
          `${e.stock} ${e.unit}`,
          e.value,
        ])
      );
    } else if (reportTab === 'customer_due') {
      downloadGenericCsv(
        'customer_due_report',
        ['Customer', 'Mobile', 'Orders', 'Total Billed', 'Paid', 'Due Balance'],
        dueCustomersList.map((c) => [
          c.name,
          c.mobile,
          c.total_orders,
          c.total_purchase_amount,
          c.total_paid_amount,
          c.total_due_amount,
        ])
      );
    } else if (reportTab === 'supplier_due') {
      downloadGenericCsv(
        'supplier_due_report',
        ['Supplier', 'Company', 'Mobile', 'Total Purchases', 'Paid', 'Payable Due'],
        dueSuppliersList.map((s) => [
          s.name,
          s.company_name,
          s.mobile,
          s.total_purchases,
          s.total_paid,
          s.total_due,
        ])
      );
    } else if (reportTab === 'income_expense') {
      const otherInc = filteredIncomes.reduce((s, i) => s + i.amount, 0);
      downloadGenericCsv(
        'income_expense_report',
        ['Type', 'Title', 'Category', 'Date', 'Amount'],
        [
          ['Sales Income', 'POS Sales Revenue', 'Sales', `${chartRange.start}..${chartRange.end}`, totalRevenue],
          ...filteredIncomes.map((i) => ['Other Income', i.title, i.category, i.date, i.amount]),
          ...filteredExpenses.map((e) => ['Expense', e.title, e.category_name, e.date, -e.amount]),
          ['Summary', 'Other Income Total', '-', '-', otherInc],
        ]
      );
    } else if (reportTab === 'employee') {
      downloadGenericCsv(
        'employee_report',
        ['Code', 'Name', 'Designation', 'Phone', 'Basic Salary', 'Total Salary Paid'],
        employees.map((emp) => {
          const totalPaid = salaries
            .filter((s) => s.employee_id === emp.id)
            .reduce((sum, s) => sum + s.net_paid, 0);
          return [emp.employee_code, emp.name, emp.designation, emp.phone, emp.basic_salary, totalPaid];
        })
      );
    }
  };

  const reportTabs: { id: ReportTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'sales_pl', label: 'Sales & P/L Report', icon: BarChart3 },
    { id: 'purchase', label: 'Purchase Report', icon: Truck },
    ...(medEnabled ? [{ id: 'medicine' as ReportTabId, label: 'Medicine Report', icon: Pill }] : []),
    ...(genEnabled ? [{ id: 'general_product' as ReportTabId, label: 'General Product Report', icon: Package }] : []),
    { id: 'stock', label: 'Stock Report', icon: Package },
    ...(medEnabled ? [{ id: 'expiry' as ReportTabId, label: 'Expiry Report', icon: AlertTriangle }] : []),
    { id: 'customer_due', label: 'Customer Due Report', icon: Users },
    { id: 'supplier_due', label: 'Supplier Due Report', icon: CreditCard },
    { id: 'income_expense', label: 'Income & Expense', icon: Wallet },
    { id: 'employee', label: 'Employee Report', icon: UserCheck },
  ];

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6 printable-area print:p-4 print:bg-white">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Reports & Comprehensive Profit / Loss Analytics</span>
          </h1>
          <p className="text-xs text-slate-500">
            {[
              'Sales',
              'Purchase',
              medEnabled ? 'Medicine' : null,
              genEnabled ? 'General Product' : null,
              'Stock',
              medEnabled ? 'Expiry' : null,
              'Profit & Loss',
              'Dues',
              'Income/Expense & Employee reports.',
            ]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex flex-wrap text-xs font-semibold shadow-sm">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7days', label: 'Last 7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Date to Date' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDateFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateFilter === btn.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <input
              type="date"
              aria-label="Report start date"
              value={fromDate}
              onChange={(e) => {
                if (!e.target.value) return;
                setFromDate(e.target.value);
                setDateFilter('custom');
              }}
              className="text-xs font-mono text-slate-700 focus:outline-none"
            />
            <span className="text-slate-400 text-xs">→</span>
            <input
              type="date"
              aria-label="Report end date"
              value={toDate}
              onChange={(e) => {
                if (!e.target.value) return;
                setToDate(e.target.value);
                setDateFilter('custom');
              }}
              className="text-xs font-mono text-slate-700 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCurrentReport}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Category Switcher */}
      <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm no-print">
        {reportTabs.map((t) => {
          const Icon = t.icon;
          const active = reportTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setReportTab(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#5b46b5] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXISTING SALES & P/L REPORT (100% INTACT) */}
      {reportTab === 'sales_pl' && (
        <>
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
                <span className="text-slate-600">
                  After {store.currency_symbol}
                  {totalOperatingExpenses.toLocaleString()} Expenses:
                </span>
                <span className="font-mono font-bold">{netMargin}% Net</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Date-to-Date Sales & Profit Trend</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {chartRange.start} → {chartRange.end} ({trendSeries.length} days)
                </p>
              </div>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendSeries} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
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
                    formatter={(value) => [
                      `${store.currency_symbol}${Number(value || 0).toLocaleString()}`,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name={`Sales Revenue (${store.currency_symbol})`}
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="grossProfit"
                    name={`Gross Profit (${store.currency_symbol})`}
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">DATE</th>
                    <th className="p-2.5 text-center">INVOICES</th>
                    <th className="p-2.5 text-right">SALES</th>
                    <th className="p-2.5 text-right">PAID</th>
                    <th className="p-2.5 text-right">DUE ADDED</th>
                    <th className="p-2.5 text-right">GROSS PROFIT</th>
                    <th className="p-2.5 text-right">EXPENSES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {[...trendSeries].reverse().map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50">
                      <td className="p-2.5 font-semibold text-slate-700">{row.date}</td>
                      <td className="p-2.5 text-center text-slate-600">{row.orders}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {store.currency_symbol}
                        {row.sales.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-blue-700">
                        {store.currency_symbol}
                        {row.paid.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right text-amber-700">
                        {store.currency_symbol}
                        {row.due.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">
                        {store.currency_symbol}
                        {row.grossProfit.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right text-rose-600">
                        {store.currency_symbol}
                        {row.expenses.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(paymentMethodTotals).length === 0 && (
                    <div className="text-center text-slate-400 text-xs py-4">No receipts recorded.</div>
                  )}
                </div>
              </div>

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
        </>
      )}

      {/* TAB 2: PURCHASE REPORT */}
      {reportTab === 'purchase' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xs text-slate-500 font-semibold">TOTAL PURCHASES</span>
              <div className="text-2xl font-bold font-mono mt-1">
                {store.currency_symbol}
                {filteredPurchases.reduce((s, p) => s + p.grand_total, 0).toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xs text-slate-500 font-semibold">PAID TO SUPPLIERS</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {store.currency_symbol}
                {filteredPurchases.reduce((s, p) => s + p.paid_amount, 0).toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xs text-slate-500 font-semibold">PURCHASE DUE ADDED</span>
              <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
                {store.currency_symbol}
                {filteredPurchases.reduce((s, p) => s + p.due_amount, 0).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="p-3">PURCHASE #</th>
                  <th className="p-3">DATE</th>
                  <th className="p-3">SUPPLIER</th>
                  <th className="p-3 text-center">ITEMS</th>
                  <th className="p-3 text-right">TOTAL</th>
                  <th className="p-3 text-right">PAID</th>
                  <th className="p-3 text-right">DUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-600">{p.purchase_number}</td>
                    <td className="p-3 font-mono text-slate-500">{p.purchase_date}</td>
                    <td className="p-3 font-semibold">{p.supplier_name}</td>
                    <td className="p-3 text-center">{p.items.length}</td>
                    <td className="p-3 text-right font-mono font-bold">{store.currency_symbol}{p.grand_total.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-emerald-600">{store.currency_symbol}{p.paid_amount.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-amber-600">{store.currency_symbol}{p.due_amount.toLocaleString()}</td>
                  </tr>
                ))}
                {filteredPurchases.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">No purchases in selected period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3 & 4: MEDICINE REPORT & GENERAL PRODUCT REPORT */}
      {(reportTab === 'medicine' || reportTab === 'general_product') && (() => {
        const list = reportTab === 'medicine' ? medicineProducts : generalProducts;
        const totalCostVal = list.reduce(
          (s, p) => s + p.variants.reduce((vs, v) => vs + v.stock_quantity * v.purchase_price, 0),
          0
        );
        const totalRetailVal = list.reduce(
          (s, p) => s + p.variants.reduce((vs, v) => vs + v.stock_quantity * v.selling_price, 0),
          0
        );
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-500 font-semibold uppercase">
                  {reportTab === 'medicine' ? 'Total Medicines' : 'Total General Products'}
                </span>
                <div className="text-2xl font-bold font-mono mt-1">{list.length}</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-500 font-semibold uppercase">Stock Cost Valuation</span>
                <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
                  {store.currency_symbol}{totalCostVal.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-500 font-semibold uppercase">Stock Retail Valuation</span>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                  {store.currency_symbol}{totalRetailVal.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="p-3">ITEM NAME</th>
                    <th className="p-3">{reportTab === 'medicine' ? 'GENERIC / COMPANY' : 'BRAND / CATEGORY'}</th>
                    <th className="p-3">VARIANT</th>
                    <th className="p-3 text-center">STOCK</th>
                    <th className="p-3 text-right">BUY PRICE</th>
                    <th className="p-3 text-right">SALE PRICE</th>
                    <th className="p-3 text-right">STOCK VALUE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.flatMap((p) =>
                    p.variants.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{p.name}</td>
                        <td className="p-3 text-slate-500">
                          {reportTab === 'medicine'
                            ? `${p.generic_name || '-'} · ${p.company_name || '-'}`
                            : `${p.brand_name || '-'} · ${categories.find((c) => c.id === p.category_id)?.name || '-'}`}
                        </td>
                        <td className="p-3">{v.variant_name}</td>
                        <td className="p-3 text-center font-mono font-bold">{v.stock_quantity} {v.unit}</td>
                        <td className="p-3 text-right font-mono">{store.currency_symbol}{v.purchase_price}</td>
                        <td className="p-3 text-right font-mono font-bold">{store.currency_symbol}{v.selling_price}</td>
                        <td className="p-3 text-right font-mono font-bold text-blue-700">
                          {store.currency_symbol}{(v.stock_quantity * v.purchase_price).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                  {list.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">No items found in this category.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: STOCK REPORT */}
      {reportTab === 'stock' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xs text-slate-500 font-semibold">TOTAL VARIANTS</span>
              <div className="text-2xl font-bold font-mono mt-1">{allVariants.length}</div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xs text-slate-500 font-semibold">LOW STOCK</span>
              <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
                {allVariants.filter((v) => v.stock_quantity > 0 && v.stock_quantity <= v.min_stock_level).length}
              </div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xs text-slate-500 font-semibold">OUT OF STOCK</span>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                {allVariants.filter((v) => v.stock_quantity <= 0).length}
              </div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xs text-slate-500 font-semibold">STOCK COST VALUE</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {store.currency_symbol}{inventoryCostValue.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="p-3">PRODUCT / VARIANT</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3 text-center">MIN LEVEL</th>
                  <th className="p-3 text-center">STOCK</th>
                  <th className="p-3 text-right">COST VALUE</th>
                  <th className="p-3 text-right">RETAIL VALUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enabledProducts.flatMap((p) =>
                  p.variants.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold">{p.name} — {v.variant_name}</td>
                      <td className="p-3 font-mono text-slate-500">{v.sku}</td>
                      <td className="p-3 text-center font-mono">{v.min_stock_level}</td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={v.stock_quantity <= 0 ? 'text-rose-600' : v.stock_quantity <= v.min_stock_level ? 'text-amber-600' : 'text-emerald-700'}>
                          {v.stock_quantity} {v.unit}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">{store.currency_symbol}{(v.stock_quantity * v.purchase_price).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold">{store.currency_symbol}{(v.stock_quantity * v.selling_price).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: EXPIRY REPORT */}
      {reportTab === 'expiry' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="p-3">ITEM & VARIANT</th>
                <th className="p-3">BATCH</th>
                <th className="p-3">EXPIRY DATE</th>
                <th className="p-3 text-center">STATUS</th>
                <th className="p-3 text-center">STOCK</th>
                <th className="p-3 text-right">AT-RISK VALUE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expiryVariants.map((e, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold">{e.productName} — {e.variantName}</td>
                  <td className="p-3 font-mono text-slate-500">{e.batch}</td>
                  <td className="p-3 font-mono">{e.expiryDate}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        e.daysLeft < 0
                          ? 'bg-rose-600 text-white'
                          : e.daysLeft <= 30
                          ? 'bg-rose-100 text-rose-700'
                          : e.daysLeft <= 90
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {e.daysLeft < 0 ? `Expired (${Math.abs(e.daysLeft)}d ago)` : `${e.daysLeft}d left`}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono">{e.stock} {e.unit}</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-700">
                    {store.currency_symbol}{e.value.toLocaleString()}
                  </td>
                </tr>
              ))}
              {expiryVariants.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No items with expiry dates recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 7: CUSTOMER DUE REPORT */}
      {reportTab === 'customer_due' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Customers with Pending Due ({dueCustomersList.length})
            </span>
            <span className="text-sm font-mono font-bold text-rose-600">
              Total Receivable: {store.currency_symbol}
              {dueCustomersList.reduce((s, c) => s + c.total_due_amount, 0).toLocaleString()}
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="p-3">CUSTOMER</th>
                <th className="p-3">MOBILE</th>
                <th className="p-3 text-center">ORDERS</th>
                <th className="p-3 text-right">TOTAL PURCHASED</th>
                <th className="p-3 text-right">PAID</th>
                <th className="p-3 text-right">DUE BALANCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dueCustomersList.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">{c.name}</td>
                  <td className="p-3 font-mono text-slate-600">{c.mobile}</td>
                  <td className="p-3 text-center font-mono">{c.total_orders}</td>
                  <td className="p-3 text-right font-mono">{store.currency_symbol}{c.total_purchase_amount.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-emerald-600">{store.currency_symbol}{c.total_paid_amount.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">{store.currency_symbol}{c.total_due_amount.toLocaleString()}</td>
                </tr>
              ))}
              {dueCustomersList.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">All customer dues are clear!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 8: SUPPLIER DUE REPORT */}
      {reportTab === 'supplier_due' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Suppliers with Pending Payable ({dueSuppliersList.length})
            </span>
            <span className="text-sm font-mono font-bold text-amber-700">
              Total Payable: {store.currency_symbol}
              {dueSuppliersList.reduce((s, x) => s + x.total_due, 0).toLocaleString()}
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="p-3">SUPPLIER NAME</th>
                <th className="p-3">COMPANY</th>
                <th className="p-3">MOBILE</th>
                <th className="p-3 text-right">TOTAL PURCHASES</th>
                <th className="p-3 text-right">PAID</th>
                <th className="p-3 text-right">DUE PAYABLE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dueSuppliersList.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">{s.name}</td>
                  <td className="p-3 text-slate-600">{s.company_name}</td>
                  <td className="p-3 font-mono text-slate-600">{s.mobile}</td>
                  <td className="p-3 text-right font-mono">{store.currency_symbol}{s.total_purchases.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-emerald-600">{store.currency_symbol}{s.total_paid.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono font-bold text-amber-700">{store.currency_symbol}{s.total_due.toLocaleString()}</td>
                </tr>
              ))}
              {dueSuppliersList.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No supplier payables pending!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 9: INCOME & EXPENSE REPORT */}
      {reportTab === 'income_expense' && (() => {
        const otherIncomeTotal = filteredIncomes.reduce((s, i) => s + i.amount, 0);
        const totalIn = totalRevenue + otherIncomeTotal;
        const netFlow = totalIn - totalOperatingExpenses;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-500 font-semibold">SALES INCOME</span>
                <div className="text-xl font-bold font-mono text-blue-700 mt-1">{store.currency_symbol}{totalRevenue.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-500 font-semibold">OTHER INCOME</span>
                <div className="text-xl font-bold font-mono text-emerald-600 mt-1">{store.currency_symbol}{otherIncomeTotal.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-500 font-semibold">TOTAL EXPENSES</span>
                <div className="text-xl font-bold font-mono text-rose-600 mt-1">{store.currency_symbol}{totalOperatingExpenses.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-500 font-semibold">NET CASH SURPLUS</span>
                <div className={`text-xl font-bold font-mono mt-1 ${netFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {store.currency_symbol}{netFlow.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase text-emerald-700">Other Income Entries ({filteredIncomes.length})</h3>
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-2">DATE</th><th className="p-2">TITLE</th><th className="p-2 text-right">AMOUNT</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIncomes.map((i) => (
                      <tr key={i.id}><td className="p-2 font-mono">{i.date}</td><td className="p-2">{i.title}</td><td className="p-2 text-right font-mono font-bold text-emerald-700">{store.currency_symbol}{i.amount.toLocaleString()}</td></tr>
                    ))}
                    {filteredIncomes.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400">No extra income entries.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase text-rose-700">Expenses ({filteredExpenses.length})</h3>
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-2">DATE</th><th className="p-2">TITLE</th><th className="p-2 text-right">AMOUNT</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((e) => (
                      <tr key={e.id}><td className="p-2 font-mono">{e.date}</td><td className="p-2">{e.title} ({e.category_name})</td><td className="p-2 text-right font-mono font-bold text-rose-600">{store.currency_symbol}{e.amount.toLocaleString()}</td></tr>
                    ))}
                    {filteredExpenses.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400">No expenses in period.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 10: EMPLOYEE REPORT */}
      {reportTab === 'employee' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="p-3">CODE</th>
                <th className="p-3">NAME & DESIGNATION</th>
                <th className="p-3">PHONE</th>
                <th className="p-3 text-center">PRESENT DAYS</th>
                <th className="p-3 text-right">BASIC SALARY</th>
                <th className="p-3 text-right">TOTAL SALARY PAID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const presentCount = attendance.filter(
                  (a) => a.employee_id === emp.id && (a.status === 'present' || a.status === 'late')
                ).length;
                const totalPaid = salaries
                  .filter((s) => s.employee_id === emp.id)
                  .reduce((sum, s) => sum + s.net_paid, 0);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-[#5b46b5]">{emp.employee_code}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{emp.name}</div>
                      <div className="text-[11px] text-slate-500">{emp.designation}</div>
                    </td>
                    <td className="p-3 font-mono">{emp.phone}</td>
                    <td className="p-3 text-center font-mono">{presentCount}</td>
                    <td className="p-3 text-right font-mono">{store.currency_symbol}{emp.basic_salary.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">{store.currency_symbol}{totalPaid.toLocaleString()}</td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No employees recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

