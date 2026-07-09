import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useLicense } from '../contexts/LicenseContext';
import Modal from './Modal/Modal';
import Button from './Button/Button';
import modalStyles from './Modal/Modal.module.scss';

export default function LicenseGuardModal() {
  const { isLocked, loading } = useLicense();
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);

  if (loading || !isLocked || location.pathname === '/license' || location.pathname === '/login') {
    return null;
  }

  if (dismissedPath === location.pathname) {
    return null;
  }

  return (
    <Modal
      title="Lisensi Anda Telah Berakhir"
      icon={<FontAwesomeIcon icon={faTriangleExclamation} className={modalStyles.iconWarning} />}
      footer={
        <>
          <Button variant="secondary" onClick={() => setDismissedPath(location.pathname)}>
            Nanti
          </Button>
          <Button variant="primary" onClick={() => navigate('/license')}>
            Perpanjang Sekarang
          </Button>
        </>
      }
    >
      <p>
        Masa aktif lisensi aplikasi telah habis. Silakan perpanjang lisensi untuk kembali menggunakan seluruh fitur.
        Data Anda tetap aman dan tidak hilang.
      </p>
    </Modal>
  );
}
