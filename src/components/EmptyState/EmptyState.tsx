import type { ReactNode } from 'react';
import { FontAwesomeIcon, type FontAwesomeIconProps } from '@fortawesome/react-fontawesome';
import { faInbox } from '@fortawesome/free-solid-svg-icons';
import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  icon?: FontAwesomeIconProps['icon'];
  message: string;
  action?: ReactNode;
}

// "No expenses yet today" + [Add Expense] button — don't show an empty table with no explanation (§10).
export default function EmptyState({ icon = faInbox, message, action }: EmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>
        <FontAwesomeIcon icon={icon} />
      </span>
      <p className={styles.text}>{message}</p>
      {action}
    </div>
  );
}
