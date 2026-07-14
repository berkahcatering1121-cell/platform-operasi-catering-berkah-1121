import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Employee,
  IngredientDraft,
  MenuCategory,
  MenuIngredient,
  MenuItemView,
  PaymentStatusRow,
  RefRow,
  Supplier,
} from '@/lib/db'

// ---- helpers ---------------------------------------------------------------
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const masterKeys = {
  ingredientCats: ['master', 'ingredient_categories'] as const,
  menuCats: ['master', 'menu_categories'] as const,
  paymentMethods: ['master', 'payment_methods'] as const,
  paymentStatuses: ['master', 'payment_statuses'] as const,
  suppliers: ['master', 'suppliers'] as const,
  employees: ['master', 'employees'] as const,
  menuItems: ['master', 'menu_items'] as const,
  ingredients: (menuItemId: string) => ['master', 'ingredients', menuItemId] as const,
}

// ---- reference lists -------------------------------------------------------
export function useIngredientCategories() {
  return useQuery({
    queryKey: masterKeys.ingredientCats,
    queryFn: async () =>
      unwrap<RefRow[]>(
        await supabase.from('ingredient_categories').select('id, name, sort').order('sort'),
      ),
  })
}

export function useMenuCategories() {
  return useQuery({
    queryKey: masterKeys.menuCats,
    queryFn: async () =>
      unwrap<MenuCategory[]>(
        await supabase.from('menu_categories').select('id, name, sort').order('sort'),
      ),
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: masterKeys.paymentMethods,
    queryFn: async () =>
      unwrap<RefRow[]>(
        await supabase.from('payment_methods').select('id, name, sort').order('sort'),
      ),
  })
}

export function usePaymentStatuses() {
  return useQuery({
    queryKey: masterKeys.paymentStatuses,
    queryFn: async () =>
      unwrap<PaymentStatusRow[]>(
        await supabase.from('payment_statuses').select('id, name, kind, sort').order('sort'),
      ),
  })
}

type RefTable = 'ingredient_categories' | 'menu_categories'
// Map a Postgres unique-violation (23505) to a friendly Indonesian message.
function dedupError(error: { code?: string; message: string } | null, name: string): void {
  if (!error) return
  if (error.code === '23505') throw new Error(`Kategori "${name.trim()}" sudah ada.`)
  throw new Error(error.message)
}

export function useAddRefCategory(table: RefTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from(table).insert({ name: name.trim(), sort: 999 }).select('id')
      dedupError(error, name)
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useUpdateRefCategory(table: RefTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from(table).update({ name: name.trim() }).eq('id', id).select('id')
      dedupError(error, name)
    },
    // Renaming an ingredient category cascades to suppliers/purchases in the DB,
    // so refresh all master queries to stay in sync.
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteRefCategory(table: RefTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from(table).delete().eq('id', id).select('id'))
    },
    // Deleting a menu category cascades to its menu items; an ingredient
    // category nulls the category on suppliers/purchases. Refresh everything.
    onSuccess: () => qc.invalidateQueries(),
  })
}

// ---- suppliers -------------------------------------------------------------
export function useSuppliers() {
  return useQuery({
    queryKey: masterKeys.suppliers,
    queryFn: async () =>
      unwrap<Supplier[]>(
        await supabase.from('suppliers').select('id, name, category, phone').order('name'),
      ),
  })
}

export function useSaveSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Supplier> & { name: string }) => {
      const payload = { name: input.name.trim(), category: input.category ?? null, phone: input.phone ?? null }
      if (input.id) unwrap(await supabase.from('suppliers').update(payload).eq('id', input.id).select('id'))
      else unwrap(await supabase.from('suppliers').insert(payload).select('id'))
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('suppliers').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

// ---- employees -------------------------------------------------------------
export function useEmployees() {
  return useQuery({
    queryKey: masterKeys.employees,
    queryFn: async () =>
      unwrap<Employee[]>(
        await supabase
          .from('employees')
          .select('id, name, position, department, salary_type, base_salary, daily_wage, is_active')
          .order('name'),
      ),
  })
}

export function useSaveEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Employee> & { name: string; salary_type: Employee['salary_type'] }) => {
      const payload = {
        name: input.name.trim(),
        position: input.position ?? null,
        department: input.department ?? null,
        salary_type: input.salary_type,
        base_salary: input.salary_type === 'Bulanan' ? input.base_salary ?? 0 : 0,
        daily_wage: input.salary_type === 'Harian' ? input.daily_wage ?? 0 : 0,
      }
      if (input.id) unwrap(await supabase.from('employees').update(payload).eq('id', input.id).select('id'))
      else unwrap(await supabase.from('employees').insert(payload).select('id'))
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('employees').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

// ---- menu items + recipe ---------------------------------------------------
export function useMenuItems() {
  return useQuery({
    queryKey: masterKeys.menuItems,
    queryFn: async () =>
      unwrap<MenuItemView[]>(
        await supabase
          .from('v_menu_items')
          .select(
            'id, category_id, category_name, name, description, sell_price, sort, hpp, ingredient_count, margin, margin_health',
          )
          .order('sort'),
      ),
  })
}

// Load recipe rows for one item (used when opening the editor).
export async function fetchIngredients(menuItemId: string): Promise<MenuIngredient[]> {
  return unwrap<MenuIngredient[]>(
    await supabase
      .from('menu_ingredients')
      .select('id, menu_item_id, name, qty, unit, price, sort')
      .eq('menu_item_id', menuItemId)
      .order('sort'),
  )
}

export interface MenuItemSaveInput {
  id?: string
  category_id: string
  name: string
  description: string
  sell_price: number
  ingredients: IngredientDraft[]
}

export function useSaveMenuItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MenuItemSaveInput) => {
      const itemPayload = {
        category_id: input.category_id,
        name: input.name.trim(),
        description: input.description.trim() || null,
        sell_price: input.sell_price,
      }
      let itemId = input.id
      if (itemId) {
        unwrap(await supabase.from('menu_items').update(itemPayload).eq('id', itemId).select('id'))
        // Replace recipe rows wholesale — simplest correct sync for a small list.
        unwrap(await supabase.from('menu_ingredients').delete().eq('menu_item_id', itemId).select('id'))
      } else {
        const rows = unwrap<{ id: string }[]>(
          await supabase.from('menu_items').insert({ ...itemPayload, sort: 999 }).select('id'),
        )
        itemId = rows[0].id
      }
      const recipe = input.ingredients
        .filter((r) => r.name.trim())
        .map((r, i) => ({
          menu_item_id: itemId,
          name: r.name.trim(),
          qty: Number(r.qty) || 0,
          unit: r.unit,
          price: Number(r.price) || 0,
          sort: i,
        }))
      if (recipe.length) unwrap(await supabase.from('menu_ingredients').insert(recipe).select('id'))
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteMenuItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('menu_items').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
