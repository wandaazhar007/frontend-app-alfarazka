export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  /** Sum of `amount` across ALL rows matching the filter, not just the current page (opt-in per endpoint, e.g. GET /api/expenses). */
  totalAmount?: number;
  /** Portion of `totalAmount` from the 'uang_makan_penjual' category (GET /api/expenses only). */
  totalMealAllowance?: number;
  /** `totalAmount` minus `totalMealAllowance` (GET /api/expenses only). */
  totalOther?: number;
}
