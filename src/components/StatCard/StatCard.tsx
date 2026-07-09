import styles from './StatCard.module.scss';

interface StatCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'highlight';
}

export default function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  const classes = [styles.card, variant === 'highlight' ? styles.highlight : ''].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
