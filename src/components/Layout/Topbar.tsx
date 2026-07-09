import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../Badge/Badge';
import { formatTanggal } from '../../utils/format';
import { findPageTitle } from './navConfig';
import styles from './Topbar.module.scss';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  seller: 'Penjual Keliling',
};

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { appUser, logout } = useAuth();
  const location = useLocation();

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {onMenuClick && (
          <button type="button" className={styles.menuButton} onClick={onMenuClick} aria-label="Buka menu">
            <FontAwesomeIcon icon={faBars} />
          </button>
        )}
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{findPageTitle(location.pathname)}</h1>
          <span className={styles.date}>{formatTanggal(new Date(), 'panjang')}</span>
        </div>
      </div>

      <div className={styles.right}>
        {appUser && (
          <>
            <span className={styles.userName}>{appUser.name}</span>
            <Badge tone="neutral">{ROLE_LABEL[appUser.role] ?? appUser.role}</Badge>
          </>
        )}
        <button type="button" className={styles.logoutButton} onClick={logout} aria-label="Keluar">
          <FontAwesomeIcon icon={faRightFromBracket} />
        </button>
      </div>
    </header>
  );
}
