export interface ReceivablePayment {
  id: string;
  amount: number;
  method: 'cash' | 'qris';
  paymentDate: string;
  note: string | null;
  createdAt: string;
}

export interface Receivable {
  id: string;
  saleId: string;
  customerId: string;
  customerName?: string;
  customName?: string | null;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  dueDate: string | null;
  status: 'dp' | 'lunas';
  createdAt: string;
  payments?: ReceivablePayment[];
}
