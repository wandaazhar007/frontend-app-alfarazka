import type { ReactNode } from 'react';
import styles from './PageHeader.module.scss';

interface PageHeaderProps {
  /** One sentence describing this page's function (§8.2) — the page title itself already shows in the Topbar. */
  description: string;
  actions?: ReactNode;
}

export default function PageHeader({ description, actions }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <p className={styles.description}>{description}</p>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
