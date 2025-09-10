import type { AppState, Debtor, Sale, SaleItem, UUID } from './types'

export const uid = (): UUID =>
  (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)) as UUID

const STORAGE_KEY = 'debts-app-state-v1'

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') {
    return { debtors: [], sales: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { debtors: [], sales: [] }
    const parsed = JSON.parse(raw) as AppState
    return parsed
  } catch {
    return { debtors: [], sales: [] }
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function upsertDebtor(state: AppState, name: string, phone?: string, notes?: string): Debtor {
  const existing = state.debtors.find((d) => d.name.trim().toLowerCase() === name.trim().toLowerCase())
  if (existing) {
    if (phone) existing.phone = phone
    if (notes) existing.notes = notes
    return existing
  }
  const debtor: Debtor = {
    id: uid(),
    name: name.trim(),
    phone,
    notes,
    createdAt: new Date().toISOString(),
  }
  state.debtors.push(debtor)
  return debtor
}

export function addSale(
  state: AppState,
  debtor: Debtor,
  items: Omit<SaleItem, 'id'>[],
  delivered: boolean,
): Sale {
  const sale: Sale = {
    id: uid(),
    debtorId: debtor.id,
    items: items.map((it) => ({ ...it, id: uid() })),
    total: items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    status: delivered ? 'delivered' : 'pending',
    deliveredAt: delivered ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  }
  state.sales.unshift(sale)
  return sale
}

export function daysSince(isoDate?: string): number {
  if (!isoDate) return 0
  const ms = Date.now() - new Date(isoDate).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export function markDelivered(state: AppState, saleId: UUID) {
  const sale = state.sales.find((s) => s.id === saleId)
  if (sale) {
    sale.status = 'delivered'
    sale.deliveredAt = new Date().toISOString()
  }
}

export function currency(n: number, locale = 'es-MX', currency = 'MXN') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n)
  } catch {
    return `$${n.toFixed(2)}`
  }
}

export function sumDebtsForDebtor(state: AppState, debtorId: UUID): number {
  return state.sales
    .filter((s) => s.debtorId === debtorId && s.status !== 'delivered')
    .reduce((sum, s) => sum + s.total, 0)
}

export function searchDebtors(state: AppState, q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return state.debtors
  return state.debtors.filter((d) => d.name.toLowerCase().includes(s))
}
