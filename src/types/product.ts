export interface Product {
  id: string;
  branchId: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductFormValues {
  name: string;
  categoryId: string;
  unitPrice: number;
  isActive: boolean;
}
