export interface SellerReportRow {
  sellerId: string;
  sellerName: string;
  cash: number;
  qris: number;
  totalPenjualan: number;
  qtyOut: number;
  qtyReturned: number;
  qtySold: number;
  isFullyReturned: boolean;
  isSettled: boolean;
  needsResettlement: boolean;
}

export interface KelilingSummary {
  totalCash: number;
  totalQris: number;
  totalPenjualan: number;
  totalQtyOut: number;
  totalQtyReturned: number;
  totalQtySold: number;
}

// Response dari GET /api/reports/keliling-status — versi ringan dari DailyReport,
// cuma breakdown keliling, dipakai halaman yang cuma butuh status retur+setoran
// per penjual (StockMorningPage/StockEveningPage/DailySettlementPage) supaya
// tidak ikut menanggung query toko+paket yang tidak mereka pakai.
export interface KelilingStatusResponse {
  sellers: SellerReportRow[];
  summary: KelilingSummary;
}

export interface TokoSaleItemRow {
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface TokoSaleRow {
  id: string;
  totalAmount: number;
  cash: number;
  qris: number;
  items: TokoSaleItemRow[];
}

export interface TokoSummary {
  cash: number;
  qris: number;
  transactionCount: number;
}

export interface PaketSaleRow {
  id: string;
  customName: string | null;
  customerName: string | null;
  totalAmount: number;
  cash: number;
  qris: number;
  paymentStatus: string;
  dueDate: string | null;
  outstanding: number;
}

export interface PaketSummary {
  cash: number;
  qris: number;
  totalNilaiPaket: number;
  outstanding: number;
  transactionCount: number;
}

export interface DailyReportSummary {
  totalCash: number;
  totalQris: number;
  totalPenjualan: number;
  totalKeliling: number;
  totalToko: number;
  totalPaket: number;
  totalQtyOut: number;
  totalQtyReturned: number;
  totalQtySold: number;
}

export interface DailyReport {
  date: string;
  keliling: { sellers: SellerReportRow[]; summary: KelilingSummary };
  toko: { sales: TokoSaleRow[]; summary: TokoSummary };
  paket: { sales: PaketSaleRow[]; summary: PaketSummary };
  summary: DailyReportSummary;
}
