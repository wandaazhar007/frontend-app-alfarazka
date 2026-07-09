import type { Receivable } from './receivable';

export interface SalePayment {
  method: 'cash' | 'qris';
  amount: number;
  note?: string | null;
}

export interface SaleItem {
  productId: string | null;
  description: string | null;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  branchId: string;
  saleType: 'keliling' | 'toko' | 'paket';
  sellerId: string | null;
  customerId?: string | null;
  customName?: string | null;
  saleDate: string;
  totalAmount: number;
  paymentStatus: string;
  payments: SalePayment[];
  items?: SaleItem[];
  receivable?: Receivable | null;
  createdAt: string;
}
