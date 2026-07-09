import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { NAV_GROUPS } from './navConfig';
import styles from './Sidebar.module.scss';

export default function Sidebar() {
  const { appUser } = useAuth();
  if (!appUser) return null;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <img className={styles.brandLogo} src="/logo-alfarazka-bakery.png" alt="" />
        <span className={styles.brandName}>Alfarazka Bakery</span>
      </div>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => item.roles.includes(appUser.role));
          if (items.length === 0) return null;

          return (
            <div className={styles.group} key={group.label}>
              <span className={styles.groupLabel}>{group.label}</span>
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className={({ isActive }) => [styles.item, isActive ? styles.itemActive : ''].filter(Boolean).join(' ')}
                >
                  <FontAwesomeIcon icon={item.icon} className={styles.itemIcon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
