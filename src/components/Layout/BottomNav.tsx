import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { getNavItemsForRole } from './navConfig';
import styles from './BottomNav.module.scss';

// Used by the seller role — only a few pages (1-2 views), so bottom nav
// fits better than a sidebar since it's used on a phone while working on the go (§6, §8.8).
export default function BottomNav() {
  const { appUser } = useAuth();
  if (!appUser) return null;

  const items = getNavItemsForRole(appUser.role);

  return (
    <nav className={styles.nav}>
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
    </nav>
  );
}
