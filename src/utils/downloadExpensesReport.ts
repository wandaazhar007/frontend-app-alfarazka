import api from '../services/api';

export default async function downloadExpensesReport(from: string, to: string, format: 'pdf' | 'xlsx') {
  const { data } = await api.get('/api/expenses/export', {
    params: { from, to, format },
    responseType: 'blob',
  });

  const url = URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `pengeluaran-${from}_${to}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
