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
