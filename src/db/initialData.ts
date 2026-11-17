import {
  StoreSettings,
  User,
  Category,
  Product,
  Customer,
  CustomerDueTransaction,
  Supplier,
  SupplierDueTransaction,
  Purchase,
  Sale,
  Expense,
  RecurringExpense,
  CashSession,
  AuditLog,
  StockTransaction,
  Brand,
  GenericItem,
  PharmaCompany,
  UnitDefinition,
  FinancialAccount,
  Employee,
} from '../types';

export const INITIAL_STORE: StoreSettings = {
  id: 'store_001',
  store_name: 'My Store POS',
  store_address: '',
  store_phone: '',
  store_mobile: '',
  store_email: '',
  seller_name: 'Store Owner',
  seller_phone: '',
  invoice_prefix: 'INV',
  receipt_header: 'Thank you for shopping with us',
  receipt_footer: 'Thank you for your visit!',
  receipt_footer_note: 'Thank you for your visit!',
  return_policy: 'Goods can be exchanged within 3 days with original cash memo.',
  currency_symbol: '৳',
  currency_code: 'BDT',
  receipt_size: '80mm',
  receipt_show_logo: true,
  receipt_show_customer: true,
  receipt_show_seller: true,
  receipt_show_signature: true,
  receipt_show_discount: true,
  receipt_show_return_policy: true,
  printer_auto_print: false,
  printer_copies: 1,
  barcode_prefix: '890',
  barcode_show_price: true,
  barcode_show_mrp: true,
  barcode_show_store_name: true,
  tax_enabled: false,
  tax_percentage: 0,
  vat_bin_number: '',
  low_stock_threshold: 10,
  critical_stock_threshold: 3,
  demo_mode_enabled: false,
  due_alert_days: 7,
  due_alert_threshold: 500,
  due_payment_info: '',
  module_medicine_enabled: true,
  module_general_product_enabled: true,
  business_mode: 'super_shop',
  enabled_payment_methods: {
    cash: true,
    bkash: true,
    nagad: true,
    rocket: true,
    card: true,
    bank: true,
  },
  language: 'en',
  branch_id: 'branch_main',
  device_id: 'pos_terminal_01',
  updated_at: new Date().toISOString(),
};

// No hardcoded staff, salesman, employee, or product records in source code
export const INITIAL_USERS: User[] = [];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_general', name: 'General Goods (সাধারণ)', code: 'GEN', active: true },
  { id: 'cat_medicine', name: 'Medicine & Pharmacy (ওষুধ)', code: 'MED', active: true },
];

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_CUSTOMER_DUES: CustomerDueTransaction[] = [];

export const INITIAL_SUPPLIER_DUES: SupplierDueTransaction[] = [];

export const INITIAL_PURCHASES: Purchase[] = [];

export const INITIAL_SALES: Sale[] = [];

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_RECURRING_EXPENSES: RecurringExpense[] = [];

export const INITIAL_CASH_SESSIONS: CashSession[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_STOCK_TRANSACTIONS: StockTransaction[] = [];

export const INITIAL_BRANDS: Brand[] = [];

export const INITIAL_GENERICS: GenericItem[] = [];

export const INITIAL_PHARMA_COMPANIES: PharmaCompany[] = [];

export const INITIAL_UNITS: UnitDefinition[] = [
  { id: 'unit_piece', name: 'Piece', short_name: 'Pcs', is_decimal_allowed: false, active: true },
  { id: 'unit_strip', name: 'Strip', short_name: 'Strip', is_decimal_allowed: false, active: true },
  { id: 'unit_tablet', name: 'Tablet', short_name: 'Tab', is_decimal_allowed: false, active: true },
  { id: 'unit_capsule', name: 'Capsule', short_name: 'Cap', is_decimal_allowed: false, active: true },
  { id: 'unit_bottle', name: 'Bottle', short_name: 'Btl', is_decimal_allowed: false, active: true },
  { id: 'unit_vial', name: 'Vial', short_name: 'Vial', is_decimal_allowed: false, active: true },
  { id: 'unit_ampoule', name: 'Ampoule', short_name: 'Amp', is_decimal_allowed: false, active: true },
  { id: 'unit_tube', name: 'Tube', short_name: 'Tube', is_decimal_allowed: false, active: true },
  { id: 'unit_sachet', name: 'Sachet', short_name: 'Sach', is_decimal_allowed: false, active: true },
  { id: 'unit_box', name: 'Box', short_name: 'Box', is_decimal_allowed: false, active: true },
  { id: 'unit_pack', name: 'Pack', short_name: 'Pack', is_decimal_allowed: false, active: true },
  { id: 'unit_carton', name: 'Carton', short_name: 'Ctn', is_decimal_allowed: false, active: true },
  { id: 'unit_kg', name: 'Kg', short_name: 'Kg', is_decimal_allowed: true, active: true },
  { id: 'unit_gram', name: 'Gram', short_name: 'g', is_decimal_allowed: true, active: true },
  { id: 'unit_liter', name: 'Liter', short_name: 'L', is_decimal_allowed: true, active: true },
  { id: 'unit_ml', name: 'Milliliter', short_name: 'ml', is_decimal_allowed: true, active: true },
  { id: 'unit_meter', name: 'Meter', short_name: 'm', is_decimal_allowed: true, active: true },
];

export const INITIAL_FINANCIAL_ACCOUNTS: FinancialAccount[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [];
