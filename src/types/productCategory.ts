export interface ProductCategory {
  id: string;
  branchId: string;
  name: string;
  hasUsage: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ProductCategoryFormValues {
  name: string;
  isActive: boolean;
}
