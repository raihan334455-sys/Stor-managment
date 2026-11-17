export type UserRole = 'admin' | 'manager' | 'salesman' | 'cashier' | 'stock_manager' | 'visitor';

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
  pin: string; // PBKDF2-SHA256 hash stored at rest
  must_change_pin?: boolean;
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

export type BusinessMode = 'general_shop' | 'pharmacy' | 'super_shop';

export interface ModuleSettings {
  medicine_management: boolean;
  general_product_management: boolean;
}

export interface EnabledPaymentMethods {
  cash: boolean;
  bkash: boolean;
  nagad: boolean;
  rocket?: boolean;
  card: boolean;
  bank: boolean;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  store_logo?: string; // base64 or url
  store_address: string;
  store_phone: string;
  store_mobile?: string;
  store_email?: string;
  seller_name: string;
  seller_phone: string;
  seller_signature?: string; // base64
  invoice_prefix?: string;
  receipt_header?: string;
  receipt_footer?: string;
  receipt_footer_note?: string;
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
  printer_auto_print?: boolean;
  printer_copies?: number;
  barcode_prefix?: string;
  barcode_show_price?: boolean;
  barcode_show_mrp?: boolean;
  barcode_show_store_name?: boolean;
  tax_enabled?: boolean;
  tax_percentage: number;
  vat_bin_number?: string;
  low_stock_threshold: number;
  critical_stock_threshold: number;
  demo_mode_enabled?: boolean;
  due_alert_threshold?: number;
  due_alert_days?: number;
  due_payment_info?: string;
  business_mode?: BusinessMode;
  module_medicine_enabled?: boolean;
  module_general_product_enabled?: boolean;
  auto_backup_enabled?: boolean;
  auto_backup_interval_hours?: number;
  last_auto_backup_at?: string;
  last_drive_sync_at?: string;
  last_firestore_sync_at?: string;
  enabled_payment_methods?: EnabledPaymentMethods;
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
  category_type?: 'medicine' | 'general' | 'both';
  active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  created_at?: string;
}

export interface GenericItem {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface PharmaCompany {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
  created_at: string;
}

export interface UnitDefinition {
  id: string;
  name: string;
  short_name: string;
  is_decimal_allowed?: boolean;
  active: boolean;
}

export type UnitType =
  | 'Piece'
  | 'Strip'
  | 'Tablet'
  | 'Capsule'
  | 'Bottle'
  | 'Vial'
  | 'Ampoule'
  | 'Tube'
  | 'Sachet'
  | 'Box'
  | 'Pack'
  | 'Carton'
  | 'Kg'
  | 'Gram'
  | 'Liter'
  | 'Milliliter'
  | 'Meter'
  | 'Custom'
  | (string & {});

export type MedicineType =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Injection'
  | 'Drop'
  | 'Ointment'
  | 'Inhaler'
  | 'Powder'
  | 'Suppository'
  | 'General'
  | (string & {});

export interface PackagingUnitConfig {
  id: string;
  unit_name: string; // e.g., 'Box', 'Strip', 'Tablet', 'Carton', 'Packet', 'Piece'
  conversion_factor: number; // How many base units = 1 of this packaging unit (base unit = 1)
  is_base?: boolean;
  barcode?: string;
  purchase_price: number;
  selling_price: number;
  mrp: number;
}

export interface BatchLot {
  id: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date?: string;
  stock_quantity: number; // Always stored in base unit
  purchase_price?: number;
  supplier_id?: string;
  created_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string; // e.g., "500ml", "Napa 500", "1 Strip (10 Tabs)"
  sku: string;
  barcode: string;
  brand_id?: string;
  size?: string;
  weight?: string;
  strength?: string;
  unit: UnitType; // Primary display / base unit
  base_unit?: string; // Explicit base unit for stock deduction (e.g., 'Tablet', 'Packet', 'Piece')
  packaging_units?: PackagingUnitConfig[];
  purchase_price: number;
  selling_price: number;
  mrp?: number;
  discount_percentage?: number;
  wholesale_price?: number;
  special_price?: number;
  stock_quantity: number; // Always in base_unit when packaging_units configured
  min_stock_level: number;
  supplier_id?: string;
  batch_number?: string;
  mfg_date?: string; // YYYY-MM-DD
  expiry_date?: string; // YYYY-MM-DD
  batches?: BatchLot[];
  warranty?: string;
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
  generic_name?: string;
  brand_name?: string;
  company_name?: string;
  medicine_type?: MedicineType | string;
  strength?: string;
  rack_number?: string;
  is_medicine?: boolean;
  active?: boolean;
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

export type DueAlertChannel = 'whatsapp' | 'sms' | 'call' | 'email' | 'share' | 'copy' | 'manual';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  customer_type: 'regular' | 'vip' | 'wholesale';
  total_orders: number;
  total_purchase_amount: number;
  total_paid_amount: number;
  total_due_amount: number;
  loyalty_points: number;
  last_purchase_date?: string;
  due_promise_date?: string;
  last_alert_sent_at?: string;
  last_alert_channel?: DueAlertChannel;
  alert_count?: number;
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
  base_unit?: string;
  conversion_factor?: number;
  base_quantity?: number;
  purchase_price: number;
  total_cost: number;
  batch_number?: string;
  mfg_date?: string;
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
  quantity: number; // Quantity in selected packaging unit (or base unit)
  unit: UnitType;
  base_unit?: string;
  conversion_factor?: number; // Base units per 1 sold unit
  base_quantity?: number; // Total base units deducted
  batch_number?: string;
  expiry_date?: string;
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
  base_unit?: string;
  conversion_factor?: number;
  batch_number?: string;
  expiry_date?: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  max_stock: number; // Available stock in base_unit (for selected batch or variant)
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

export type StockAdjustmentType =
  | 'owner_personal_use'
  | 'staff_personal_use'
  | 'damaged_stock'
  | 'expired_stock'
  | 'wastage'
  | 'free_sample'
  | 'promotional_use'
  | 'stock_correction'
  | 'missing_lost';

export interface StockAdjustmentRecord {
  id: string;
  reference_no: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  is_medicine: boolean;
  adjustment_type: StockAdjustmentType;
  direction: 'deduct' | 'add';
  available_stock_before: number;
  quantity: number;
  unit: string;
  purchase_price: number;
  selling_price: number;
  total_purchase_value: number;
  date: string;
  time: string;
  reason: string;
  note?: string;
  taken_by: string;
  recorded_by: string;
  user_id: string;
  created_at: string;
  branch_id: string;
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
    | 'expired'
    | 'personal_use'
    | 'adjustment'
    | 'stock_in'
    | 'stock_out'
    | 'transfer';
  quantity_change: number; // positive for increase, negative for decrease (in base unit)
  previous_stock: number;
  new_stock: number;
  batch_number?: string;
  base_unit?: string;
  reference_no?: string; // invoice # or purchase #
  user_id: string;
  user_name: string;
  reason?: string;
  created_at: string;
  branch_id: string;
}

export interface PurchaseReturnItem {
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  quantity: number;
  unit_cost: number;
  refund_amount: number;
  reason: string;
}

export interface PurchaseReturn {
  id: string;
  return_number: string;
  purchase_number?: string;
  supplier_id: string;
  supplier_name: string;
  items: PurchaseReturnItem[];
  total_refund: number;
  refund_mode: 'cash' | 'bank' | 'adjust_due';
  reason?: string;
  processed_by: string;
  date: string;
  time: string;
  created_at: string;
  branch_id: string;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  quantity: number;
  unit: UnitType;
  from_location: string;
  to_location: string;
  notes?: string;
  transferred_by: string;
  date: string;
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
  employee_id?: string;
  employee_code?: string;
  shift_label?: string;
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

export interface AccountIncome {
  id: string;
  income_number: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  time: string;
  payment_method: PaymentMethodType;
  reference?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  branch_id: string;
}

export interface CashFlowEntry {
  id: string;
  entry_number: string;
  type: 'cash_in' | 'cash_out';
  title: string;
  amount: number;
  source_or_purpose: string;
  date: string;
  time: string;
  notes?: string;
  created_by: string;
  created_at: string;
  branch_id: string;
}

export interface FinancialAccount {
  id: string;
  account_type: 'bank' | 'mobile_banking';
  provider_name: string; // e.g., Dutch-Bangla Bank, bKash, Nagad, Rocket
  account_name: string;
  account_number: string;
  branch_or_type?: string; // e.g., Gulshan Branch, Merchant, Personal, Agent
  balance: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialAccountTx {
  id: string;
  account_id: string;
  account_name: string;
  tx_type: 'deposit' | 'withdraw';
  amount: number;
  reference?: string;
  notes?: string;
  date: string;
  time: string;
  created_by: string;
  created_at: string;
}

export type EmployeeShiftType = 'morning' | 'evening' | 'night' | 'full_day' | 'custom';

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  designation: string;
  department?: string;
  phone: string;
  email?: string;
  address?: string;
  nid_number?: string;
  joining_date: string;
  basic_salary: number;
  linked_user_id?: string;
  shift?: EmployeeShiftType;
  shift_label?: string;
  shift_start?: string;
  shift_end?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnifiedStaffInput {
  employeeId?: string;
  linkedUserId?: string;
  employeeCode: string;
  name: string;
  designation: string;
  department?: string;
  phone: string;
  email?: string;
  address?: string;
  nidNumber?: string;
  joiningDate: string;
  basicSalary: number;
  shift: EmployeeShiftType;
  shiftLabel?: string;
  shiftStart: string;
  shiftEnd: string;
  active: boolean;
  enablePosLogin: boolean;
  username?: string;
  role?: UserRole;
  plainPin?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_code?: string;
  employee_name: string;
  shift?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  notes?: string;
  marked_by: string;
  updated_at: string;
}

export interface SalaryPayment {
  id: string;
  voucher_number: string;
  employee_id: string;
  employee_name: string;
  month_year: string; // YYYY-MM
  basic_salary: number;
  bonus: number;
  deduction: number;
  advance_adjusted: number;
  net_paid: number;
  payment_method: PaymentMethodType;
  payment_date: string;
  notes?: string;
  paid_by: string;
  created_at: string;
}

export interface DatabaseBackup {
  version: string;
  timestamp: string;
  store: StoreSettings;
  users: User[];
  categories: Category[];
  brands?: Brand[];
  generics?: GenericItem[];
  pharma_companies?: PharmaCompany[];
  units?: UnitDefinition[];
  products: Product[];
  customers: Customer[];
  customer_dues: CustomerDueTransaction[];
  suppliers: Supplier[];
  supplier_dues: SupplierDueTransaction[];
  purchases: Purchase[];
  purchase_returns?: PurchaseReturn[];
  sales: Sale[];
  stock_transactions: StockTransaction[];
  stock_adjustments?: StockAdjustmentRecord[];
  stock_transfers?: StockTransfer[];
  returns: SaleReturn[];
  expenses: Expense[];
  recurring_expenses: RecurringExpense[];
  incomes?: AccountIncome[];
  cash_flows?: CashFlowEntry[];
  financial_accounts?: FinancialAccount[];
  financial_account_txs?: FinancialAccountTx[];
  employees?: Employee[];
  attendance?: AttendanceRecord[];
  salaries?: SalaryPayment[];
  cash_sessions: CashSession[];
  quotations: Quotation[];
  audit_logs: AuditLog[];
}
