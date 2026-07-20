export interface PayrollDailyBreakdown {
  date: string;
  rotiQty: number;
  tierSalary: number;
  commissionAmount: number;
}

export interface PayrollPreview {
  totalTierSalary: number;
  totalCommission: number;
  outstandingDebt: number;
  debtDeduction: number;
  netPayout: number;
  dailyBreakdown: PayrollDailyBreakdown[];
}

export type PayrollClosingStatus = 'draft' | 'paid';

export interface PayrollClosing {
  id: string;
  sellerId: string;
  sellerName: string;
  periodMonth: string;
  totalTierSalary: number;
  totalCommission: number;
  totalDebtDeduction: number;
  netPayout: number;
  status: PayrollClosingStatus;
  paidAt: string | null;
  createdAt: string;
}
