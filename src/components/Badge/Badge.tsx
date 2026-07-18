import type { ReactNode } from 'react';
import styles from './Badge.module.scss';

// success = paid/active, warning = down payment/pending, danger = expired/failed, neutral = default neutral
type Tone = 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  tone: Tone;
  children: ReactNode;
  /** Extra class from the caller's own module — e.g. to size up a badge used as a standalone page element (not a table-cell status pill). */
  className?: string;
}

export default function Badge({ tone, children, className }: BadgeProps) {
  return <span className={[styles.badge, styles[tone], className].filter(Boolean).join(' ')}>{children}</span>;
}
