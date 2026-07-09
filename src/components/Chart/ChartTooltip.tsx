import { formatRupiah } from '../../utils/format';
import styles from './ChartTooltip.module.scss';

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { value: number }[];
}

export default function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className={styles.tooltip}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{formatRupiah(payload[0].value)}</div>
    </div>
  );
}
