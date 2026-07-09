import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import LicenseBanner from '../LicenseBanner';
import LicenseGuardModal from '../LicenseGuardModal';
import styles from './AppLayout.module.scss';

// Shell for admin & owner: sidebar stays fixed on desktop, becomes a drawer on mobile/tablet (§6).
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className={styles.shell}>
      <div className={styles.desktopSidebar}>
        <Sidebar />
      </div>

      {drawerOpen && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />
          <div className={styles.drawerPanel}>
            <Sidebar />
            <button type="button" className={styles.drawerCloseButton} onClick={() => setDrawerOpen(false)} aria-label="Tutup menu">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </>
      )}

      <div className={styles.main}>
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <LicenseBanner />
        <LicenseGuardModal />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
