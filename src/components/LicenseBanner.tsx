import { useNavigate } from 'react-router-dom';
import { useLicense } from '../contexts/LicenseContext';
import Button from './Button/Button';
import styles from './LicenseBanner.module.scss';

export default function LicenseBanner() {
  const { license } = useLicense();
  const navigate = useNavigate();

  if (!license || license.status !== 'active' || license.daysLeft === null || license.daysLeft > 7) {
    return null;
  }

  return (
    <div className={styles.banner}>
      <span>Lisensi berakhir dalam {license.daysLeft} hari.</span>
      <Button variant="ghost" size="sm" onClick={() => navigate('/license')}>
        Perpanjang
      </Button>
    </div>
  );
}
