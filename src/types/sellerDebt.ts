export type SellerDebtSource = 'kekurangan_setoran' | 'pinjaman';
export type SellerDebtStatus = 'belum_lunas' | 'lunas';
export type SellerDebtPaymentMethod = 'cash' | 'qris' | 'potongan_gaji';

export interface SellerDebt {
  id: string;
  sellerId: string;
  sellerName: string;
  source: SellerDebtSource;
  debtDate: string;
  expectedAmount: number | null;
  actualAmount: number | null;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  status: SellerDebtStatus;
  note: string | null;
  createdAt: string;
}

export interface SellerDebtPayment {
  id: string;
  amount: number;
  method: SellerDebtPaymentMethod;
  paymentDate: string;
  note: string | null;
  createdAt: string;
}

export interface SellerDebtWithPayments extends SellerDebt {
  payments: SellerDebtPayment[];
}

export interface CreateLoanFormValues {
  sellerId: string;
  date: string;
  amount: number | '';
  note: string;
}
