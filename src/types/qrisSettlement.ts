export interface QrisSettlement {
  id: string;
  branchId: string;
  sellerId: string;
  settlementDate: string;
  terminalId: string | null;
  amount: number;
  createdAt: string;
}
