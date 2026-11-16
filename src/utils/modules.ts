import { BusinessMode, Category, Product, StoreSettings } from '../types';

export const getBusinessMode = (store: StoreSettings): BusinessMode => {
  if (store.business_mode) return store.business_mode;
  const med = store.module_medicine_enabled !== false;
  const gen = store.module_general_product_enabled !== false;
  if (!med && gen) return 'general_shop';
  if (med && !gen) return 'pharmacy';
  return 'super_shop';
};

export const isMedicineModuleEnabled = (store: StoreSettings): boolean => {
  const mode = getBusinessMode(store);
  if (mode === 'general_shop') return false;
  if (mode === 'pharmacy') return true;
  return store.module_medicine_enabled !== false;
};

export const isGeneralProductModuleEnabled = (store: StoreSettings): boolean => {
  const mode = getBusinessMode(store);
  if (mode === 'pharmacy') return false;
  if (mode === 'general_shop') return true;
  return store.module_general_product_enabled !== false;
};

export const withBusinessMode = (store: StoreSettings, mode: BusinessMode): StoreSettings => {
  const med = mode === 'pharmacy' || mode === 'super_shop';
  const gen = mode === 'general_shop' || mode === 'super_shop';
  return {
    ...store,
    business_mode: mode,
    module_medicine_enabled: med,
    module_general_product_enabled: gen,
    updated_at: new Date().toISOString(),
  };
};

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

