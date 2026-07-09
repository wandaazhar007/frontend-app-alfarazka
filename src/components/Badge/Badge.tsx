import type { ReactNode } from 'react';
import styles from './Badge.module.scss';

// success = paid/active, warning = down payment/pending, danger = expired/failed, neutral = default neutral
type Tone = 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  tone: Tone;
  children: ReactNode;
}

export default function Badge({ tone, children }: BadgeProps) {
  return <span className={[styles.badge, styles[tone]].join(' ')}>{children}</span>;
}
