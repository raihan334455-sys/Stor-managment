import { Expense, Sale } from '../types';

export interface DailySalesTrendPoint {
  date: string;
  label: string;
  sales: number;
  paid: number;
  due: number;
  orders: number;
  expenses: number;
  grossProfit: number;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function shiftIsoDate(baseYmd: string, deltaDays: number): string {
  const parts = baseYmd.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + deltaDays);
    return fallback.toISOString().slice(0, 10);
  }
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export function formatShortDateLabel(ymd: string): string {
  const parts = ymd.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return ymd;
  const monthName = SHORT_MONTHS[parts[1] - 1] || '';
  return `${monthName} ${String(parts[2]).padStart(2, '0')}`;
}

export function enumerateDateRange(
  startDate: string,
  endDate: string,
  maxDays: number = 366
): string[] {
  if (!startDate || !endDate) return [];
  const start = startDate <= endDate ? startDate : endDate;
  const end = startDate <= endDate ? endDate : startDate;

  const sp = start.split('-').map((n) => parseInt(n, 10));
  const ep = end.split('-').map((n) => parseInt(n, 10));
  if (sp.length !== 3 || ep.length !== 3) return [];

  const cur = new Date(Date.UTC(sp[0], sp[1] - 1, sp[2]));
  const endDt = new Date(Date.UTC(ep[0], ep[1] - 1, ep[2]));
  const dates: string[] = [];

  while (cur.getTime() <= endDt.getTime() && dates.length < maxDays) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export function buildSalesTrendSeries(params: {
  sales: Sale[];
  expenses?: Expense[];
  startDate: string;
  endDate: string;
}): DailySalesTrendPoint[] {
  const { sales, expenses = [], startDate, endDate } = params;
  const dates = enumerateDateRange(startDate, endDate);
  const map = new Map<string, DailySalesTrendPoint>();

  for (const d of dates) {
    map.set(d, {
      date: d,
      label: formatShortDateLabel(d),
      sales: 0,
      paid: 0,
      due: 0,
      orders: 0,
      expenses: 0,
      grossProfit: 0,
    });
  }

  for (const s of sales) {
    if (s.status !== 'completed') continue;
    const bucket = map.get(s.date);
    if (!bucket) continue;
    bucket.sales += s.grand_total || 0;
    bucket.paid += s.paid_amount || 0;
    bucket.due += s.due_amount || 0;
    bucket.orders += 1;

    const cogs = (s.items || []).reduce(
      (acc, item) =>
        acc + (item.unit_purchase_price || item.unit_selling_price * 0.75) * item.quantity,
      0
    );
    bucket.grossProfit += Math.max(0, (s.grand_total || 0) - cogs);
  }

  for (const e of expenses) {
    const bucket = map.get(e.date);
    if (!bucket) continue;
    bucket.expenses += e.amount || 0;
  }

  return dates.map((d) => {
    const pt = map.get(d)!;
    return {
      ...pt,
      sales: Math.round(pt.sales * 100) / 100,
      paid: Math.round(pt.paid * 100) / 100,
      due: Math.round(pt.due * 100) / 100,
      expenses: Math.round(pt.expenses * 100) / 100,
      grossProfit: Math.round(pt.grossProfit * 100) / 100,
    };
  });
}

export function exportDateRangeReportCsv(params: {
  points: DailySalesTrendPoint[];
  storeName: string;
  startDate: string;
  endDate: string;
  currencySymbol: string;
}): void {
  const { points, storeName, startDate, endDate, currencySymbol } = params;
  const sym = currencySymbol || '৳';
  const header = [
    'Date',
    'Orders',
    `Sales Total (${sym})`,
    `Paid Collected (${sym})`,
    `Due Added (${sym})`,
    `Expenses (${sym})`,
  ];

  const rows = points.map((p) => [
    p.date,
    String(p.orders),
    String(p.sales),
    String(p.paid),
    String(p.due),
    String(p.expenses),
  ]);

  const totals = points.reduce(
    (acc, p) => ({
      orders: acc.orders + p.orders,
      sales: acc.sales + p.sales,
      paid: acc.paid + p.paid,
      due: acc.due + p.due,
      expenses: acc.expenses + p.expenses,
    }),
    { orders: 0, sales: 0, paid: 0, due: 0, expenses: 0 }
  );

  rows.push([
    'TOTAL',
    String(totals.orders),
    String(Math.round(totals.sales * 100) / 100),
    String(Math.round(totals.paid * 100) / 100),
    String(Math.round(totals.due * 100) / 100),
    String(Math.round(totals.expenses * 100) / 100),
  ]);

  const csvContent =
    '\uFEFF' +
    [
      `"${storeName.replace(/"/g, '""')} - Date to Date Sales Report (${startDate} to ${endDate})"`,
      header.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeStore = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'store';
  link.href = url;
  link.download = `${safeStore}-report-${startDate}-to-${endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
