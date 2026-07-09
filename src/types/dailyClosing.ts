export interface DailyClosing {
  id: string;
  branchId: string;
  closingDate: string;
  totalSalesCash: number;
  totalSalesQris: number;
  totalExpenses: number;
  grossProfit: number;
  totalBreadSold: number;
  totalBreadReturned: number;
  notes: string | null;
  createdAt: string;
}
