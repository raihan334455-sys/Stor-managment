export type UserRole = 'admin' | 'manager' | 'cashier' | 'stock_manager' | 'visitor';

export type PermissionKey =
  | 'pos_sale'
  | 'price_change'
  | 'discount_override'
  | 'invoice_cancel'
  | 'product_manage'
  | 'inventory_adjust'
  | 'supplier_manage'
  | 'customer_manage'
  | 'due_manage'
  | 'expense_manage'
  | 'reports_view'
  | 'user_manage'
  | 'settings_manage'
  | 'backup_manage';

export interface User {
  id: string;
  name: string;
  username: string;
  pin: string; // 4-6 digit PIN for quick login/override
  role: UserRole;
  phone?: string;
  email?: string;
  active: boolean;
  permissions: PermissionKey[];
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
  branch_id: string;
  device_id: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  store_logo?: string; // base64 or url
  store_address: string;
  store_phone: string;
  store_email?: string;
  seller_name: string;
  seller_phone: string;
  seller_signature?: string; // base64
  receipt_header?: string;
  receipt_footer?: string;
  return_policy?: string;
  currency_symbol: string; // e.g. ৳ or $
  currency_code: string; // e.g. BDT or USD
  receipt_size: '58mm' | '80mm';
  receipt_show_logo: boolean;
  receipt_show_customer: boolean;
  receipt_show_seller: boolean;
  receipt_show_signature: boolean;
  receipt_show_discount: boolean;
  receipt_show_return_policy: boolean;
  tax_percentage: number;
  low_stock_threshold: number;
  critical_stock_threshold: number;
  language: 'en' | 'bn';
  branch_id: string;
  device_id: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  active: boolean;
}

export interface Brand {
  id: string;
  name: string;
}

export type UnitType =
  | 'Piece'
  | 'Kg'
  | 'Gram'
  | 'Liter'
  | 'Milliliter'
  | 'Pack'
  | 'Box'
  | 'Bottle'
  | 'Carton'
  | 'Meter'
  | 'Custom';

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string; // e.g., "500ml", "1 Kg", "Family Pack"
  sku: string;
  barcode: string;
  brand_id?: string;
  size?: string;
  weight?: string;
  unit: UnitType;
  purchase_price: number;
  selling_price: number;
  wholesale_price?: number;
  special_price?: number;
  stock_quantity: number;
  min_stock_level: number;
  supplier_id?: string;
  batch_number?: string;
  expiry_date?: string; // YYYY-MM-DD
  active: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
  branch_id: string;
  device_id: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  brand_id?: string;
  image?: string;
  code: string;
  variants: ProductVariant[];
  archived: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
  branch_id: string;
  device_id: string;
}

export interface PriceHistory {
  id: string;
  variant_id: string;
  old_purchase_price: number;
  new_purchase_price: number;
  old_selling_price: number;
  new_selling_price: number;
  changed_by: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  company_name: string;
  mobile: string;
  email?: string;
  address?: string;
  total_purchases: number;
  total_paid: number;
  total_due: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
  branch_id: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  customer_type: 'regular' | 'vip' | 'wholesale';
  total_orders: number;
  total_purchase_amount: number;
  total_paid_amount: number;
  total_due_amount: number;
  loyalty_points: number;
  last_purchase_date?: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
  branch_id: string;
}

export interface CustomerDueTransaction {
  id: string;
  customer_id: string;
  customer_name: string;
  mobile: string;
  invoice_number?: string;
  type: 'due_added' | 'due_payment';
  date: string;
  time: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  balance_after: number;
  payment_method?: PaymentMethodType;
  created_by: string;
  notes?: string;
  sync_status: 'synced' | 'pending';
  branch_id: string;
}

export interface SupplierDueTransaction {
  id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_invoice?: string;
  type: 'due_added' | 'due_payment';
  date: string;
  time: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  balance_after: number;
  payment_method?: PaymentMethodType;
  created_by: string;
  notes?: string;
  sync_status: 'synced' | 'pending';
  branch_id: string;
}

export interface PurchaseItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  quantity: number;
  unit: UnitType;
  purchase_price: number;
  total_cost: number;
  batch_number?: string;
  expiry_date?: string;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name: string;
  supplier_invoice_no?: string;
  purchase_date: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: PaymentMethodType;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
  branch_id: string;
}

export type PaymentMethodType = 'cash' | 'bkash' | 'nagad' | 'card' | 'bank' | 'split';

export interface SplitPaymentDetail {
  cash?: number;
  bkash?: number;
  nagad?: number;
  card?: number;
  bank?: number;
}

export interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  sku: string;
  barcode: string;
  quantity: number; // Supports decimal e.g. 0.75
  unit: UnitType;
  unit_purchase_price: number; // Kept at time of sale for accurate COGS
  unit_selling_price: number;
  discount: number;
  total_price: number;
  is_loose_item?: boolean;
}

export interface Sale {
  id: string;
  invoice_number: string; // e.g. INV-20260812-0001
  customer_id?: string;
  customer_name: string;
  customer_mobile: string;
  seller_id: string;
  seller_name: string;
  items: SaleItem[];
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  tax_amount: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: PaymentMethodType;
  split_details?: SplitPaymentDetail;
  hold_reference?: string;
  status: 'completed' | 'voided' | 'returned' | 'exchanged';
  void_reason?: string;
  void_by?: string;
  void_at?: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
  branch_id: string;
  device_id: string;
  user_id: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  sku: string;
  barcode: string;
  unit: UnitType;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  max_stock: number;
  item_discount: number;
  total_price: number;
}

export interface HeldCart {
  id: string;
  customer_name: string;
  customer_mobile: string;
  items: CartItem[];
  note: string;
  held_at: string;
  held_by: string;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  transaction_type:
    | 'purchase'
    | 'sale'
    | 'customer_return'
    | 'supplier_return'
    | 'damage'
    | 'wastage'
    | 'adjustment';
  quantity_change: number; // positive for increase, negative for decrease
  previous_stock: number;
  new_stock: number;
  reference_no?: string; // invoice # or purchase #
  user_id: string;
  user_name: string;
  reason?: string;
  created_at: string;
  branch_id: string;
}

export interface ReturnItem {
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  reason: string;
}

export interface SaleReturn {
  id: string;
  return_number: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  items: ReturnItem[];
  total_refund: number;
  refund_method: PaymentMethodType;
  processed_by: string;
  date: string;
  time: string;
  created_at: string;
  branch_id: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  title: string;
  category_id: string;
  category_name: string;
  amount: number;
  date: string;
  time: string;
  payment_method: PaymentMethodType;
  status: 'paid' | 'unpaid';
  voucher_number?: string;
  service_provider?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  branch_id: string;
}

export interface RecurringExpense {
  id: string;
  title: string;
  category_name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  due_day_of_month: number;
  next_due_date: string;
  notes?: string;
  active: boolean;
}

export interface CashSession {
  id: string;
  cashier_id: string;
  cashier_name: string;
  start_time: string;
  end_time?: string;
  opening_cash: number;
  total_cash_sales: number;
  total_digital_sales: number;
  total_due_sales: number;
  total_cash_expenses: number;
  total_due_collected_cash: number;
  expected_closing_cash: number;
  actual_closing_cash?: number;
  discrepancy?: number;
  status: 'open' | 'closed';
  notes?: string;
  branch_id: string;
  device_id: string;
}

export interface QuotationItem {
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  unit: UnitType;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_mobile: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  grand_total: number;
  created_by: string;
  valid_until: string;
  status: 'draft' | 'converted' | 'expired';
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  description: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  ip_address?: string;
  created_at: string;
  branch_id: string;
}

export interface DatabaseBackup {
  version: string;
  timestamp: string;
  store: StoreSettings;
  users: User[];
  categories: Category[];
  products: Product[];
  customers: Customer[];
  customer_dues: CustomerDueTransaction[];
  suppliers: Supplier[];
  supplier_dues: SupplierDueTransaction[];
  purchases: Purchase[];
  sales: Sale[];
  stock_transactions: StockTransaction[];
  returns: SaleReturn[];
  expenses: Expense[];
  recurring_expenses: RecurringExpense[];
  cash_sessions: CashSession[];
  quotations: Quotation[];
  audit_logs: AuditLog[];
}
