import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faGauge,
  faBoxOpen,
  faRotateLeft,
  faQrcode,
  faStore,
  faGift,
  faHandHoldingDollar,
  faWallet,
  faBookOpen,
  faChartLine,
  faBreadSlice,
  faTags,
  faUsers,
  faAddressBook,
  faCreditCard,
  faClipboardList,
  faUserPlus,
  faSackDollar,
  faMoneyCheckDollar,
} from '@fortawesome/free-solid-svg-icons';
import type { Role } from '../../types/auth';

export interface NavItem {
  label: string;
  path: string;
  icon: IconDefinition;
  roles: Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Sidebar group structure per docs/07_DESIGN_SYSTEM.md §8.8. Also used by
// Topbar to look up the active page title from the path — single source of truth.
//
// Notes on adjustments to actual routes:
// - "Settlement QRIS" in the spec was merged into one page with "Setoran Sore"
//   (DailySettlementPage already handles both at once).
// - "Pengaturan" (Settings) in the System group doesn't have a page in this app yet — not
//   included so no menu item points to an empty page.

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Ringkasan',
    items: [
      { label: 'Dashboard', path: '/admin', icon: faGauge, roles: ['admin'] },
      { label: 'Dashboard', path: '/owner', icon: faGauge, roles: ['owner'] },
      { label: 'Dashboard', path: '/seller', icon: faGauge, roles: ['seller'] },
    ],
  },
  {
    label: 'Operasional Harian',
    items: [
      { label: 'Stok Pagi', path: '/admin/stock/morning', icon: faBoxOpen, roles: ['admin'] },
      { label: 'Retur Sore', path: '/admin/stock/evening', icon: faRotateLeft, roles: ['admin'] },
      { label: 'Setoran & QRIS', path: '/admin/daily-settlement', icon: faQrcode, roles: ['admin'] },
    ],
  },
  {
    label: 'Penjualan',
    items: [
      { label: 'Penjualan Toko', path: '/admin/sales/toko', icon: faStore, roles: ['admin'] },
      { label: 'Penjualan Paket', path: '/admin/sales/paket', icon: faGift, roles: ['admin'] },
      { label: 'Piutang', path: '/receivables', icon: faHandHoldingDollar, roles: ['admin', 'owner'] },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { label: 'Pengeluaran', path: '/admin/expenses', icon: faWallet, roles: ['admin'] },
      { label: 'Tutup Buku', path: '/admin/daily-closing', icon: faBookOpen, roles: ['admin'] },
      { label: 'Laporan', path: '/reports/daily', icon: faChartLine, roles: ['admin', 'owner'] },
      { label: 'Utang Penjual', path: '/seller-debts', icon: faSackDollar, roles: ['admin', 'owner'] },
      { label: 'Gaji Penjual', path: '/seller-payroll', icon: faMoneyCheckDollar, roles: ['admin', 'owner'] },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { label: 'Produk', path: '/admin/products', icon: faBreadSlice, roles: ['admin'] },
      { label: 'Kategori Produk', path: '/admin/product-categories', icon: faTags, roles: ['admin'] },
      { label: 'Kategori Pengeluaran', path: '/admin/expense-categories', icon: faClipboardList, roles: ['admin'] },
      { label: 'Penjual', path: '/admin/sellers', icon: faUsers, roles: ['admin'] },
      { label: 'Pelanggan', path: '/admin/customers', icon: faAddressBook, roles: ['admin'] },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { label: 'Lisensi', path: '/license', icon: faCreditCard, roles: ['admin', 'owner'] },
      { label: 'Audit Log', path: '/owner/audit-logs', icon: faClipboardList, roles: ['owner'] },
      { label: 'Tambah User', path: '/owner/users', icon: faUserPlus, roles: ['owner'] },
    ],
  },
];

export function getNavItemsForRole(role: Role): NavItem[] {
  return NAV_GROUPS.flatMap((group) => group.items).filter((item) => item.roles.includes(role));
}

export function findPageTitle(pathname: string): string {
  for (const group of NAV_GROUPS) {
    const match = group.items.find((item) => item.path === pathname);
    if (match) return match.label;
  }
  return 'Alfarazka Bakery';
}
