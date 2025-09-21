import type { AppState, Debtor, Sale, SaleItem, UUID } from './types';
import type { AppMode } from './mode';

export const uid = (): UUID =>
  (crypto?.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)) as UUID;

// Claves de almacenamiento separadas por modo
const STORAGE_KEY_SALES = 'sales-manager-state-v1';
const STORAGE_KEY_DEBTS = 'debts-manager-state-v1';
// Legacy keys (ventas) a migrar
const LEGACY_STORAGE_KEYS = ['debts-app-state-v1'];

function keyForMode(mode: AppMode): string {
  return mode === 'debts' ? STORAGE_KEY_DEBTS : STORAGE_KEY_SALES;
}

export function loadState(mode: AppMode = 'sales'): AppState {
  if (typeof localStorage === 'undefined') {
    return { debtors: [], sales: [] };
  }
  try {
    const STORAGE_KEY = keyForMode(mode);
    // If new key already exists, use it directly.
    let raw = localStorage.getItem(STORAGE_KEY);

    // Attempt migration from legacy keys if new key absent.
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        if (legacyKey === STORAGE_KEY) continue;
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          try {
            // Validate JSON before migrating.
            const parsed = JSON.parse(legacyRaw) as AppState;
            if (parsed && Array.isArray(parsed.debtors) && Array.isArray(parsed.sales)) {
              localStorage.setItem(STORAGE_KEY, legacyRaw);
              localStorage.removeItem(legacyKey);
              raw = legacyRaw;
              break;
            }
          } catch {
            // Ignore invalid legacy content; do not migrate.
          }
        }
      }
    }
    if (!raw) return { debtors: [], sales: [] };
    const parsed = JSON.parse(raw) as AppState;
    return parsed;
  } catch {
    return { debtors: [], sales: [] };
  }
}

export function saveState(state: AppState, mode: AppMode = 'sales') {
  try {
    const STORAGE_KEY = keyForMode(mode);
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
  items: (Omit<SaleItem, 'id'> & { unitPriceVES?: number })[],
  delivered: boolean,
  currency: 'USD' | 'VES' = 'USD',
): Sale {
  const sale: Sale = {
    id: uid(),
    debtorId: debtor.id,
    items: items.map((it) => ({ ...it, id: uid() })),
    total: items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    paid: delivered ? items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0) : 0,
    status: delivered ? 'delivered' : 'pending',
    deliveredAt: delivered ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
    currency,
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
    sale.paid = sale.total;
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

// --- Bolivar (VES) exchange rate helpers ---
interface StoredRate {
  value: number; // bolivares per 1 USD
  updatedAt: string; // ISO
}

export interface BolivarRateData {
  value: number;
  updatedAt: string; // ISO
}

const BOLIVAR_RATE_KEY = 'bolivar-rate-v1';
const BOLIVAR_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

/** Load cached bolivar rate from localStorage if not older than TTL (1 hour). */
function getCachedBolivarRateData(): BolivarRateData | null {
  try {
    const raw = localStorage.getItem(BOLIVAR_RATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRate;
    const ageMs = Date.now() - new Date(parsed.updatedAt).getTime();
    if (ageMs > BOLIVAR_CACHE_TTL_MS) return null; // expired
    if (typeof parsed.value === 'number' && parsed.value > 0)
      return { value: parsed.value, updatedAt: parsed.updatedAt };
    return null;
  } catch {
    return null;
  }
}

function cacheBolivarRate(value: number) {
  try {
    const rec: StoredRate = { value, updatedAt: new Date().toISOString() };
    localStorage.setItem(BOLIVAR_RATE_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
}

/**
 * Fetch current official bolivar exchange rate (bolivares per USD).
 * By default returns a cached value if it is still fresh (<= 1h).
 * Pass { force: true } to ignore cache and hit the API.
 */
export async function fetchBolivarRate(opts?: {
  signal?: AbortSignal;
  force?: boolean;
}): Promise<BolivarRateData | null> {
  const signal = opts?.signal;
  if (!opts?.force) {
    const cached = getCachedBolivarRateData();
    if (cached) return cached;
  }
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal });
    if (!res.ok) throw new Error('Failed to fetch rate');
    const data = await res.json();
    const value = Number(data?.promedio);
    if (!Number.isFinite(value) || value <= 0) return null;
    cacheBolivarRate(value);
    return { value, updatedAt: new Date().toISOString() };
  } catch {
    // As a fallback, try returning cached (even if previously returned null due to TTL)
    try {
      const raw = localStorage.getItem(BOLIVAR_RATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredRate;
        if (typeof parsed.value === 'number' && parsed.value > 0)
          return { value: parsed.value, updatedAt: parsed.updatedAt };
      }
    } catch {
      // ignore
    }
    return null;
  }
}

/** Return cached bolivar rate (may be expired if older than cache window returns null). */
export function getBolivarCached(): BolivarRateData | null {
  return getCachedBolivarRateData();
}

/** Format amount in bolivares given a USD amount and a bolivar-per-USD rate. */
export function formatBs(amountUSD: number, rate: number, locale = 'es-VE'): string {
  const bolivares = amountUSD * rate;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'VES' }).format(bolivares);
  } catch {
    return `Bs ${bolivares.toFixed(2)}`;
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
  items: Array<{ id?: UUID; product: string; quantity: number; unitPrice: number }>,
): void {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale) return;
  const existing = new Map(sale.items.map((it) => [it.id, it]));
  const next: SaleItem[] = [];
  for (const incoming of items) {
    const product = incoming.product?.toString().trim();
    if (!product) continue; // skip invalid
    const quantity = Math.max(1, Number(incoming.quantity));
    const unitPrice = Math.max(0, Number(incoming.unitPrice));
    if (incoming.id && existing.has(incoming.id)) {
      const prev = existing.get(incoming.id)!;
      // Mantener unitPriceVES si ya existía o si la venta está en VES
      const unitPriceVES = sale.currency === 'VES' ? prev.unitPriceVES : undefined;
      next.push({ ...prev, product, quantity, unitPrice, unitPriceVES });
    } else {
      next.push({ id: uid(), product, quantity, unitPrice });
    }
  }
  if (!next.length) return; // don't allow empty sale
  sale.items = next;
  sale.total = sale.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  if (sale.paid && sale.paid > sale.total) sale.paid = sale.total; // cap after edits
}

/** Toggle a sale as paid (delivered) or pending, setting deliveredAt accordingly. */
export function setSalePaid(state: AppState, saleId: UUID, paid: boolean): void {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale) return;
  if (paid) {
    sale.status = 'delivered';
    sale.paid = sale.total;
    if (!sale.deliveredAt) sale.deliveredAt = new Date().toISOString();
  } else {
    sale.status = 'pending';
    sale.deliveredAt = undefined;
    if (sale.paid && sale.paid >= sale.total) {
      // If previously fully paid, keep amount but status now pending; business rule could reset. We'll leave as is.
    }
  }
}

/** Register a partial payment (abono) on a sale. Clamps between 0 and sale.total. */
export function addPartialPayment(state: AppState, saleId: UUID, amount: number): void {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale) return;
  const amt = Math.max(0, Number(amount) || 0);
  sale.paid = Math.min(sale.total, (sale.paid || 0) + amt);
  if (sale.paid >= sale.total) {
    sale.status = 'delivered';
    if (!sale.deliveredAt) sale.deliveredAt = new Date().toISOString();
  }
}

/** Remaining amount (total - paid). */
export function remainingAmount(sale: Sale): number {
  return Math.max(0, sale.total - (sale.paid || 0));
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
