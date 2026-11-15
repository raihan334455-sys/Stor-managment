import { BatchLot, PackagingUnitConfig, ProductVariant } from '../types';

export function getVariantBaseUnit(variant: Pick<ProductVariant, 'base_unit' | 'unit'>): string {
  return (variant.base_unit || variant.unit || 'Piece').trim() || 'Piece';
}

export function getVariantPackagingOptions(variant: ProductVariant): PackagingUnitConfig[] {
  const baseUnit = getVariantBaseUnit(variant);
  const raw = Array.isArray(variant.packaging_units) ? variant.packaging_units : [];

  const valid = raw
    .filter((u) => u && u.unit_name && u.conversion_factor > 0)
    .map((u) => ({
      ...u,
      unit_name: u.unit_name.trim(),
      conversion_factor: Math.max(0.0001, Number(u.conversion_factor) || 1),
      purchase_price: Number(u.purchase_price) || 0,
      selling_price: Number(u.selling_price) || 0,
      mrp: Number(u.mrp ?? u.selling_price) || 0,
    }));

  if (valid.length === 0) {
    return [
      {
        id: `pkg_base_${variant.id}`,
        unit_name: baseUnit,
        conversion_factor: 1,
        is_base: true,
        barcode: variant.barcode,
        purchase_price: variant.purchase_price,
        selling_price: variant.selling_price,
        mrp: variant.mrp ?? variant.selling_price,
      },
    ];
  }

  // Ensure a base unit (factor 1) exists
  const hasBase = valid.some((u) => u.conversion_factor === 1 || u.is_base);
  const normalized = hasBase
    ? valid.map((u) =>
        u.conversion_factor === 1 ? { ...u, is_base: true } : { ...u, is_base: false }
      )
    : [
        ...valid,
        {
          id: `pkg_base_${variant.id}`,
          unit_name: baseUnit,
          conversion_factor: 1,
          is_base: true,
          barcode: variant.barcode,
          purchase_price: variant.purchase_price,
          selling_price: variant.selling_price,
          mrp: variant.mrp ?? variant.selling_price,
        },
      ];

  // Sort ascending by conversion_factor or descending? Keep base last or sorted descending for display;
  // Return sorted descending (Box -> Strip -> Tablet) so largest pack to base unit is consistent.
  return [...normalized].sort((a, b) => b.conversion_factor - a.conversion_factor);
}

export function findPackagingByBarcode(
  variant: ProductVariant,
  candidates: string[]
): PackagingUnitConfig | null {
  const opts = getVariantPackagingOptions(variant);
  const lowerCandidates = candidates.map((c) => c.trim().toLowerCase()).filter(Boolean);

  for (const opt of opts) {
    if (opt.barcode && lowerCandidates.includes(opt.barcode.trim().toLowerCase())) {
      return opt;
    }
  }
  return null;
}

export function getVariantBatches(variant: ProductVariant): BatchLot[] {
  if (Array.isArray(variant.batches) && variant.batches.length > 0) {
    return [...variant.batches].sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    });
  }

  if (variant.batch_number || variant.expiry_date || variant.mfg_date) {
    return [
      {
        id: `batch_default_${variant.id}`,
        batch_number: variant.batch_number || 'DEFAULT',
        mfg_date: variant.mfg_date,
        expiry_date: variant.expiry_date,
        stock_quantity: variant.stock_quantity,
        purchase_price: variant.purchase_price,
        supplier_id: variant.supplier_id,
      },
    ];
  }

  return [];
}

export function getPreferredBatchForSale(variant: ProductVariant): BatchLot | null {
  const batches = getVariantBatches(variant);
  if (batches.length === 0) return null;
  const available = batches.filter((b) => b.stock_quantity > 0);
  return available[0] || batches[0] || null;
}

export function getDaysUntilExpiry(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatStockBreakdown(baseQty: number, variant: ProductVariant): string {
  const baseUnit = getVariantBaseUnit(variant);
  const roundedBase = Math.round(baseQty * 1000) / 1000;
  const opts = getVariantPackagingOptions(variant).filter((u) => u.conversion_factor > 1);
  if (opts.length === 0 || roundedBase <= 0) {
    return `${roundedBase} ${baseUnit}`;
  }

  // Compute hierarchical remainder breakdown from largest pack down
  let rem = Math.floor(roundedBase);
  const parts: string[] = [];
  for (const pkg of opts) {
    const factor = Math.floor(pkg.conversion_factor);
    if (factor > 1 && rem >= factor) {
      const count = Math.floor(rem / factor);
      rem = rem % factor;
      parts.push(`${count} ${pkg.unit_name}`);
    }
  }
  const frac = Math.round((roundedBase - Math.floor(roundedBase)) * 1000) / 1000;
  if (rem + frac > 0) {
    parts.push(`${rem + frac} ${baseUnit}`);
  }

  if (parts.length <= 1 && parts[0]?.endsWith(` ${baseUnit}`)) {
    return `${roundedBase} ${baseUnit}`;
  }
  return `${roundedBase} ${baseUnit} (${parts.join(', ')})`;
}

export function getBasePackagingPriceOption(variant: ProductVariant): PackagingUnitConfig {
  const opts = getVariantPackagingOptions(variant);
  return opts.find((o) => o.is_base || o.conversion_factor === 1) || opts[opts.length - 1];
}
