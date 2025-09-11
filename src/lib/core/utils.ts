import type { AppState, Debtor, Sale, SaleItem, UUID } from './types';

export const uid = (): UUID =>
  (crypto?.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)) as UUID;

const STORAGE_KEY = 'debts-app-state-v1';

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') {
    return { debtors: [], sales: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { debtors: [], sales: [] };
    const parsed = JSON.parse(raw) as AppState;
    return parsed;
  } catch {
    return { debtors: [], sales: [] };
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function upsertDebtor(
  state: AppState,
  name: string,
  phone?: string,
  notes?: string,
): Debtor {
  const existing = state.debtors.find(
    (d) => d.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (existing) {
    if (phone) existing.phone = phone;
    if (notes) existing.notes = notes;
    return existing;
  }
  const debtor: Debtor = {
    id: uid(),
    name: name.trim(),
    phone,
    notes,
    createdAt: new Date().toISOString(),
  };
  state.debtors.push(debtor);
  return debtor;
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
  };
  state.sales.unshift(sale);
  return sale;
}

export function daysSince(isoDate?: string): number {
  if (!isoDate) return 0;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function markDelivered(state: AppState, saleId: UUID) {
  const sale = state.sales.find((s) => s.id === saleId);
  if (sale) {
    sale.status = 'delivered';
    sale.deliveredAt = new Date().toISOString();
  }
}

export function currency(n: number, locale = 'es-MX', currency = 'MXN') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function sumDebtsForDebtor(state: AppState, debtorId: UUID): number {
  return state.sales
    .filter((s) => s.debtorId === debtorId && s.status !== 'delivered')
    .reduce((sum, s) => sum + s.total, 0);
}

export function searchDebtors(state: AppState, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return state.debtors;
  return state.debtors.filter((d) => d.name.toLowerCase().includes(s));
}

/**
 * Update an existing sale's items (product name, quantity, unit price) and recompute the total.
 * Unknown item ids are ignored. Quantity is clamped to >= 1 and unitPrice to >= 0.
 */
export function updateSale(
  state: AppState,
  saleId: UUID,
  items: Array<Pick<SaleItem, 'id' | 'product' | 'quantity' | 'unitPrice'>>,
): void {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale) return;
  const map = new Map(items.map((it) => [it.id, it]));
  sale.items = sale.items.map((orig) => {
    const upd = map.get(orig.id);
    if (!upd) return orig;
    const product = (upd.product ?? orig.product).toString().trim();
    const quantity = Math.max(
      1,
      Number.isFinite(upd.quantity) ? Number(upd.quantity) : orig.quantity,
    );
    const unitPrice = Math.max(
      0,
      Number.isFinite(upd.unitPrice) ? Number(upd.unitPrice) : orig.unitPrice,
    );
    return { ...orig, product, quantity, unitPrice };
  });
  sale.total = sale.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
}

/** Toggle a sale as paid (delivered) or pending, setting deliveredAt accordingly. */
export function setSalePaid(state: AppState, saleId: UUID, paid: boolean): void {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale) return;
  if (paid) {
    sale.status = 'delivered';
    if (!sale.deliveredAt) sale.deliveredAt = new Date().toISOString();
  } else {
    sale.status = 'pending';
    sale.deliveredAt = undefined;
  }
}

/** Update the name of a debtor by id. Trims input; ignores empty. */
export function updateDebtorName(state: AppState, debtorId: UUID, newName: string): void {
  const name = newName?.toString().trim();
  if (!name) return;
  const d = state.debtors.find((x) => x.id === debtorId);
  if (!d) return;
  d.name = name;
}

/** Set a per-sale debtorName override for a specific sale. */
// Per-sale debtorName override removed by request; global debtor name will be updated instead.

/** Return top N product names by frequency across all sales. */
export function topProducts(state: AppState, limit = 5): string[] {
  const counts = new Map<string, { count: number; label: string }>();
  for (const s of state.sales) {
    for (const it of s.items) {
      const key = it.product.trim().toLowerCase();
      const rec = counts.get(key);
      if (rec) {
        rec.count += 1;
        rec.label = it.product; // keep latest original casing
      } else {
        counts.set(key, { count: 1, label: it.product });
      }
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((x) => x.label);
}

/** Return top N product names by frequency for a debtor name (case-insensitive), or empty if not found. */
export function topProductsForDebtorName(state: AppState, debtorName: string, limit = 5): string[] {
  const d = state.debtors.find(
    (x) => x.name.trim().toLowerCase() === debtorName.trim().toLowerCase(),
  );
  if (!d) return [];
  const counts = new Map<string, { count: number; label: string }>();
  for (const s of state.sales) {
    if (s.debtorId !== d.id) continue;
    for (const it of s.items) {
      const key = it.product.trim().toLowerCase();
      const rec = counts.get(key);
      if (rec) {
        rec.count += 1;
        rec.label = it.product;
      } else {
        counts.set(key, { count: 1, label: it.product });
      }
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((x) => x.label);
}
