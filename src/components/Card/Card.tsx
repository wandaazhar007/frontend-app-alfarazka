import type { ReactNode } from 'react';
import styles from './Card.module.scss';

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, action, children, className }: CardProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')}>
      {(title || action) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
