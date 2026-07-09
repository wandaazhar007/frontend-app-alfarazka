import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import styles from './SellerLayout.module.scss';

export default function SellerLayout() {
  return (
    <div className={styles.shell}>
      <Topbar />
      <div className={styles.content}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
