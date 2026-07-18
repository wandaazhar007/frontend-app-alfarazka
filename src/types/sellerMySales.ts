export interface SellerMySales {
  /** Diisi kalau request pakai `date` (satu hari, legacy). */
  date?: string;
  /** Diisi kalau request pakai `from`/`to` (rentang tanggal). */
  from?: string;
  to?: string;
  sellerId: string;
  sellerName: string;
  cash: number;
  qris: number;
  totalPenjualan: number;
  qtyOut: number;
  qtyReturned: number;
  qtySold: number;
}
