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

// GET /api/seller/my-earnings?from=&to= — dipakai section "Penghasilan" di
// SellerDashboard, rentang tanggal bebas (bukan harus 1 bulan kalender).
export interface SellerEarnings {
  totalTierSalary: number;
  totalCommission: number;
  totalRotiQty: number;
  totalCommissionQty: number;
  daysWorked: number;
  totalPenghasilan: number;
  /** Total kekurangan setoran yang TERJADI dalam rentang tanggal ini (berdasarkan debt_date). */
  totalMinusSetoran: number;
  /** Total pinjaman/kasbon yang TERJADI dalam rentang tanggal ini (berdasarkan debt_date). */
  totalPinjaman: number;
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
