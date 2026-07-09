import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartTokens } from '../../styles/chartTokens';
import { formatTanggal, formatRupiah } from '../../utils/format';
import ChartTooltip from './ChartTooltip';
import Card from '../Card/Card';
import EmptyState from '../EmptyState/EmptyState';

interface TrendPoint {
  date: string;
  total: number;
}

interface SalesTrendChartProps {
  data: TrendPoint[];
  title: string;
}

export default function SalesTrendChart({ data, title }: SalesTrendChartProps) {
  if (data.every((d) => d.total === 0)) {
    return (
      <Card title={title}>
        <EmptyState message="Belum ada data penjualan pada rentang ini." />
      </Card>
    );
  }

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartTokens.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartTokens.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartTokens.border} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatTanggal(value, 'pendek')}
            tick={{ fill: chartTokens.textMuted, fontSize: 12 }}
            axisLine={{ stroke: chartTokens.border }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value: number) => formatRupiah(value)}
            tick={{ fill: chartTokens.textMuted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<ChartTooltip />} labelFormatter={(value) => formatTanggal(String(value), 'panjang')} />
          <Area type="monotone" dataKey="total" stroke={chartTokens.primary} strokeWidth={2} fill="url(#salesTrendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
