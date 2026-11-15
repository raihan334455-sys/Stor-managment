import { Sale } from '../types';

export interface PurchasedProductSummary {
  key: string;
  product_name: string;
  variant_name: string;
  unit: string;
  total_qty: number;
  order_count: number;
  total_spent: number;
}

export interface MobilePurchaseStats {
  totalOrders: number;
  totalLineItems: number;
  totalProductQuantity: number;
  uniqueProductsCount: number;
  totalSpent: number;
  breakdown: PurchasedProductSummary[];
}

export function normalizeMobile(mobile?: string): string {
  if (!mobile) return '';
  const digits = mobile.replace(/[^0-9]/g, '');
  if (digits.startsWith('880') && digits.length >= 13) {
    return digits.slice(2);
  }
  return digits;
}

export function getMobilePurchaseStats(
  mobile: string | undefined,
  sales: Sale[],
  customerId?: string
): MobilePurchaseStats {
  const normTarget = normalizeMobile(mobile);

  const matchingSales = sales.filter((s) => {
    if (s.status === 'voided') return false;
    const normSaleMob = normalizeMobile(s.customer_mobile);
    if (normTarget && normSaleMob) {
      return normSaleMob === normTarget;
    }
    if (customerId && s.customer_id) {
      return s.customer_id === customerId;
    }
    return false;
  });

  let totalLineItems = 0;
  let totalProductQuantity = 0;
  let totalSpent = 0;
  const map = new Map<string, PurchasedProductSummary>();

  for (const s of matchingSales) {
    totalSpent += s.grand_total || 0;
    const seenInSale = new Set<string>();
    for (const item of s.items) {
      totalLineItems += 1;
      totalProductQuantity += item.quantity || 0;
      const key = `${item.product_id || item.product_name}::${item.variant_id || item.variant_name}`;
      const existing = map.get(key);
      if (existing) {
        existing.total_qty = Math.round((existing.total_qty + (item.quantity || 0)) * 1000) / 1000;
        existing.total_spent = Math.round((existing.total_spent + (item.total_price || 0)) * 100) / 100;
        if (!seenInSale.has(key)) {
          existing.order_count += 1;
          seenInSale.add(key);
        }
      } else {
        seenInSale.add(key);
        map.set(key, {
          key,
          product_name: item.product_name,
          variant_name: item.variant_name,
          unit: item.unit,
          total_qty: Math.round((item.quantity || 0) * 1000) / 1000,
          order_count: 1,
          total_spent: Math.round((item.total_price || 0) * 100) / 100,
        });
      }
    }
  }

  const breakdown = Array.from(map.values()).sort((a, b) => b.total_qty - a.total_qty);

  return {
    totalOrders: matchingSales.length,
    totalLineItems,
    totalProductQuantity: Math.round(totalProductQuantity * 1000) / 1000,
    uniqueProductsCount: breakdown.length,
    totalSpent: Math.round(totalSpent * 100) / 100,
    breakdown,
  };
}
