export type UUID = string;

export type SaleStatus = 'delivered' | 'pending';

export interface Debtor {
  id: UUID;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string; // ISO
}

export interface SaleItem {
  id: UUID;
  product: string;
  quantity: number;
  unitPrice: number;
  /** Si la venta se ingresó originalmente en VES, almacenar el precio original en bolívares para edición futura. */
  unitPriceVES?: number;
}

export interface Sale {
  id: UUID;
  debtorId: UUID;
  items: SaleItem[];
  total: number;
  paid?: number; // total amount paid (<= total)
  deliveredAt?: string; // ISO if delivered
  createdAt: string; // ISO
  status: SaleStatus;
  /** Moneda base con la que se ingresó la venta originalmente. */
  currency?: 'USD' | 'VES';
}

export interface AppState {
  debtors: Debtor[];
  sales: Sale[];
}

export interface NewSaleForm {
  debtorName: string;
  phone?: string;
  items: Array<{
    product: string;
    quantity: number;
    unitPrice: number;
  }>;
  delivered: boolean;
  notes?: string;
  /** Moneda en la que se ingresan los precios unitarios. 'USD' para dólares o 'VES' (Bolívares). */
  currency?: 'USD' | 'VES';
}
