export type Role = 'owner' | 'admin' | 'seller';

export interface AppUser {
  id: string;
  branchId: string | null;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isVendor?: boolean;
  mustChangePassword: boolean;
}
