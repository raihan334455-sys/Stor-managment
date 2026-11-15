import { Category, Product, StoreSettings } from '../types';

export const isMedicineModuleEnabled = (store: StoreSettings): boolean =>
  store.module_medicine_enabled !== false;

export const isGeneralProductModuleEnabled = (store: StoreSettings): boolean =>
  store.module_general_product_enabled !== false;

export const isDemoModeEnabled = (store: StoreSettings): boolean =>
  store.demo_mode_enabled !== false;

export const isMedicineProduct = (p: Product): boolean =>
  Boolean(p.is_medicine) ||
  p.category_id === 'cat_medicine' ||
  Boolean(p.generic_name) ||
  (Boolean(p.medicine_type) && p.medicine_type !== 'General');

export const isMedicineCategory = (c: Category): boolean =>
  c.category_type === 'medicine' ||
  c.id === 'cat_medicine' ||
  c.name.toLowerCase().includes('medicine') ||
  c.name.toLowerCase().includes('pharmacy');

export const isProductEnabled = (p: Product, store: StoreSettings): boolean => {
  const med = isMedicineProduct(p);
  return med ? isMedicineModuleEnabled(store) : isGeneralProductModuleEnabled(store);
};

export const isCategoryEnabled = (c: Category, store: StoreSettings): boolean => {
  if (c.category_type === 'both') {
    return isMedicineModuleEnabled(store) || isGeneralProductModuleEnabled(store);
  }
  const medCat = isMedicineCategory(c);
  return medCat ? isMedicineModuleEnabled(store) : isGeneralProductModuleEnabled(store);
};
