export interface ExpenseCategory {
  id: number;
  name: string;
  hasUsage: boolean;
}

export interface ExpenseCategoryFormValues {
  name: string;
}

export interface Expense {
  id: string;
  branchId: string;
  categoryId: number;
  categoryName: string;
  amount: number;
  description: string | null;
  /** Diisi HANYA untuk pengeluaran "Uang Makan Penjual" — dipakai mencegah input dobel per penjual/tanggal. */
  sellerId: string | null;
  expenseDate: string;
  createdBy: string;
  createdAt: string;
}
