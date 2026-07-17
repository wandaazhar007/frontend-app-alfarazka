import api from '../services/api';

export default async function downloadReportRange(from: string, to: string, format: 'pdf' | 'xlsx') {
  const { data } = await api.get('/api/reports/export', {
    params: { from, to, format },
    responseType: 'blob',
  });

  const url = URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `laporan-harian-${from}_${to}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
