export interface Customer {
  id: string;
  branchId: string;
  name: string;
  phone: string | null;
  address: string | null;
  customerType: 'individual' | 'langganan';
  hasUsage: boolean;
  createdAt: string;
}

export interface CustomerFormValues {
  name: string;
  phone: string;
  address: string;
  customerType: 'individual' | 'langganan';
}
