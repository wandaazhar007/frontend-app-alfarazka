export interface Seller {
  id: string;
  userId: string;
  branchId: string;
  qrisTerminalId: string | null;
  dailyMealAllowance: number;
  hasUsage: boolean;
  isActive: boolean;
  createdAt: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface SellerFormValues {
  name: string;
  email: string;
  phone: string;
  qrisTerminalId: string;
  dailyMealAllowance: number | '';
  isActive: boolean;
}
