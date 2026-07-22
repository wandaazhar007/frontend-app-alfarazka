export interface PayrollDailyBreakdown {
  date: string;
  rotiQty: number;
  tierSalary: number;
  commissionQty: number;
  commissionAmount: number;
}

export interface PayrollPreview {
  totalTierSalary: number;
  totalCommission: number;
  totalRotiQty: number;
  totalCommissionQty: number;
  daysWorked: number;
  outstandingDebt: number;
  debtDeduction: number;
  netPayout: number;
  dailyBreakdown: PayrollDailyBreakdown[];
  /** Tanggal paling awal dalam periode dimana penjual bawa stok tapi belum setoran cash/QRIS — null kalau semua sudah setoran. */
  unsettledDate: string | null;
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
