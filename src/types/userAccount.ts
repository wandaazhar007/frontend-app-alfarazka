export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserFormValues {
  role: 'admin' | 'seller';
  name: string;
  email: string;
  phone: string;
  qrisTerminalId: string;
  dailyMealAllowance: number;
  isActive: boolean;
}
