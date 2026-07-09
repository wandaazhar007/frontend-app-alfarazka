// Centralized Indonesian locale formatting — used EVERYWHERE that displays
// money/dates (see docs/07_DESIGN_SYSTEM.md §9). Don't do ad-hoc formatting in components.

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// 'panjang' -> "Senin, 8 Juli 2026" (page detail/header)
// 'pendek'  -> "08/07/2026" (table column)
export function formatTanggal(date: string | Date, style: 'panjang' | 'pendek' = 'pendek'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (style === 'panjang') {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(d);
}

// Bread qty etc. — displayed with a dot separator, no decimals.
export function formatAngka(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n);
}