export interface Product {
  id: string;
  branchId: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  unitPrice: number;
  costPrice: number;
  /** Komisi flat per unit terjual untuk penjual keliling (mis. Es Sirsak) — 0 untuk produk roti biasa. */
  commissionPerUnit: number;
  hasUsage: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ProductFormValues {
  name: string;
  categoryId: string;
  unitPrice: number | '';
  costPrice: number | '';
  commissionPerUnit: number | '';
  isActive: boolean;
}
