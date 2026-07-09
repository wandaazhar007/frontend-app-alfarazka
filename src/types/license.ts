export interface LicenseStatus {
  status: 'active' | 'expired' | 'inactive';
  planName: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
  /** true if the backend is running with DISABLE_LICENSE_CHECK=true (dev only) */
  devBypass?: boolean;
}

export interface LicensePlan {
  id: number;
  name: string;
  durationDays: number;
  price: number;
}

export interface LicensePayment {
  id: string;
  planId: number;
  planName: string;
  orderId: string;
  transactionId: string | null;
  paymentMethod: string | null;
  amount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}
