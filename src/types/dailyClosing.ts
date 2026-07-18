export interface DailyClosing {
  id: string;
  branchId: string;
  closingDate: string;
  totalSalesCash: number;
  totalSalesQris: number;
  totalCogs: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  totalBreadSold: number;
  totalBreadReturned: number;
  notes: string | null;
  createdAt: string;
}

// Response dari GET /api/daily-closings/range-totals — sama field-nya dengan
// DailyClosing tapi dihitung LIVE untuk sebuah rentang (bukan baris tersimpan
// per hari, jadi tanpa id/closingDate/notes/createdAt).
export interface RangeTotals {
  totalSalesCash: number;
  totalSalesQris: number;
  totalCogs: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  totalBreadSold: number;
  totalBreadReturned: number;
}
