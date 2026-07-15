export interface Product {
  id: string;
  branchId: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  unitPrice: number;
  costPrice: number;
  hasUsage: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ProductFormValues {
  name: string;
  categoryId: string;
  unitPrice: number | '';
  costPrice: number | '';
  isActive: boolean;
}
