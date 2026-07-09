export interface StockMovement {
  id: string;
  branchId: string;
  sellerId: string;
  sellerName: string | null;
  productId: string;
  productName: string | null;
  movementDate: string;
  qtyOut: number;
  qtyReturned: number;
  qtySold: number;
  createdAt: string;
}
