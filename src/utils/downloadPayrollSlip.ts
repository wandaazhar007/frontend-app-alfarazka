import api from '../services/api';

const MONTH_NAMES_ID = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
];

// "2026-07" -> "juli-2026" — nama bulan, bukan angka, biar lebih mudah dibaca di nama file.
function formatPeriodMonthForFilename(periodMonth: string): string {
  const [year, month] = periodMonth.split('-').map(Number);
  return `${MONTH_NAMES_ID[month - 1]}-${year}`;
}

export default async function downloadPayrollSlip(sellerId: string, sellerName: string, periodMonth: string) {
  const { data } = await api.get('/api/seller-payroll/slip', {
    params: { sellerId, periodMonth },
    responseType: 'blob',
  });

  // `link.download` menentukan nama file final di browser (bukan Content-Disposition
  // dari backend — itu diabaikan karena diakses lewat blob URL, bukan navigasi langsung).
  const safeSellerName = sellerName.replace(/[^a-zA-Z0-9]+/g, '-');
  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `slip-gaji-${safeSellerName}-${formatPeriodMonthForFilename(periodMonth)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
