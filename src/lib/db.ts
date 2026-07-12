// Row shapes mirroring the Postgres schema + computed views. Kept hand-written
// (rather than generated) so the app has a single, readable source of truth.

export type SalaryType = 'Harian' | 'Bulanan'

export const SATUAN_OPTIONS = [
  'pcs', 'kg', 'gr', 'liter', 'ml', 'btr', 'ikat', 'porsi', 'bungkus', 'sdm', 'sdt',
] as const
export type Satuan = (typeof SATUAN_OPTIONS)[number]

export type MarginHealth = 'green' | 'amber' | 'red' | 'none'

export interface RefRow {
  id: string
  name: string
  sort: number
}

export interface PaymentStatusRow extends RefRow {
  kind: 'green' | 'amber' | 'red'
}

export interface Supplier {
  id: string
  name: string
  category: string | null
  phone: string | null
}

export interface Employee {
  id: string
  name: string
  position: string | null
  department: string | null
  salary_type: SalaryType
  base_salary: number
  daily_wage: number
  is_active: boolean
}

export interface MenuCategory {
  id: string
  name: string
  sort: number
}

export interface MenuIngredient {
  id: string
  menu_item_id: string
  name: string
  qty: number
  unit: Satuan
  price: number
  sort: number
}

// From v_menu_items (computed hpp / margin / health).
export interface MenuItemView {
  id: string
  category_id: string
  category_name: string
  name: string
  description: string | null
  sell_price: number
  sort: number
  hpp: number
  ingredient_count: number
  margin: number | null
  margin_health: MarginHealth
}

// Draft ingredient row used inside the recipe editor (before persistence).
export interface IngredientDraft {
  id?: string
  name: string
  qty: string
  unit: Satuan
  price: string
}

// From v_purchases (computed total, month_key, supplier_name).
export interface PurchaseView {
  id: string
  purchase_date: string
  material_name: string
  category: string | null
  supplier_id: string | null
  supplier_name: string | null
  qty: number
  unit: string | null
  unit_price: number
  total: number
  status: string
  pic_employee_id: string | null
  notes: string | null
  photos: string[]
  month_key: string
}

// From v_sales (computed total, sisa, month_key, pic_name).
export interface SaleView {
  id: string
  sale_date: string
  customer: string
  menu_category: string | null
  menu_name: string | null
  portions: number
  price_per_portion: number
  total: number
  sisa: number
  method: string | null
  status: string
  paid_amount: number
  pic_employee_id: string | null
  pic_name: string | null
  notes: string | null
  photos: string[]
  month_key: string
}
