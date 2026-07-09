import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartTokens } from '../../styles/chartTokens';
import { formatRupiah } from '../../utils/format';
import ChartTooltip from './ChartTooltip';
import Card from '../Card/Card';
import EmptyState from '../EmptyState/EmptyState';

interface SellerComparisonPoint {
  sellerName: string;
  total: number;
}

interface SellerComparisonChartProps {
  data: SellerComparisonPoint[];
  title: string;
}

export default function SellerComparisonChart({ data, title }: SellerComparisonChartProps) {
  if (data.length === 0 || data.every((d) => d.total === 0)) {
    return (
      <Card title={title}>
        <EmptyState message="Belum ada data penjualan pada rentang ini." />
      </Card>
    );
  }

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chartTokens.border} vertical={false} />
          <XAxis
            dataKey="sellerName"
            tick={{ fill: chartTokens.textMuted, fontSize: 12 }}
            axisLine={{ stroke: chartTokens.border }}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tickFormatter={(value: number) => formatRupiah(value)}
            tick={{ fill: chartTokens.textMuted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTokens.primarySoft }} />
          <Bar dataKey="total" fill={chartTokens.primary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
