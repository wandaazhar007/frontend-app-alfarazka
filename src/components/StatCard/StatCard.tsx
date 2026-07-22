import styles from './StatCard.module.scss';

interface StatCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'highlight' | 'success' | 'danger';
}

export default function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  const classes = [styles.card, variant !== 'default' ? styles[variant] : ''].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
