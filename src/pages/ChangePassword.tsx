import { useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button/Button';
import FormField from '../components/FormField/FormField';
import LoadingOverlay from '../components/LoadingOverlay/LoadingOverlay';
import styles from './ChangePassword.module.scss';

const MIN_LENGTH = 8;

interface FormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

export default function ChangePassword() {
  const { logout, refreshAppUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!newPassword) nextErrors.newPassword = 'Password baru wajib diisi.';
    else if (newPassword.length < MIN_LENGTH) nextErrors.newPassword = `Password baru minimal ${MIN_LENGTH} karakter.`;
    if (!confirmPassword) nextErrors.confirmPassword = 'Konfirmasi password wajib diisi.';
    else if (confirmPassword !== newPassword) nextErrors.confirmPassword = 'Konfirmasi password tidak sama.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setError(null);
    setSubmitting(true);
    try {
      await api.post('/api/auth/change-password', { newPassword });
      await refreshAppUser();
    } catch {
      setError('Gagal menyimpan password baru. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img className={styles.logo} src="/logo-alfarazka-bakery.png" alt="Alfarazka Bakery" />
        <h1 className={styles.title}>Buat Password Baru</h1>
        <p className={styles.subtitle}>
          Ini login pertama Anda. Demi keamanan, silakan buat password baru sebelum melanjutkan.
        </p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField label="Password Baru" htmlFor="new-password" required error={errors.newPassword} help={`Minimal ${MIN_LENGTH} karakter`}>
            <div className={styles.passwordField}>
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, newPassword: undefined }));
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                title={showNewPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </FormField>
          <FormField label="Konfirmasi Password Baru" htmlFor="confirm-password" required error={errors.confirmPassword}>
            <div className={styles.passwordField}>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                title={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </FormField>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className={styles.submitButton}
            icon={<FontAwesomeIcon icon={faFloppyDisk} />}
          >
            {submitting ? 'Menyimpan...' : 'Simpan Password Baru'}
          </Button>
        </form>

        <button type="button" className={styles.logoutLink} onClick={logout}>
          Bukan Anda? Keluar
        </button>
      </div>

      {submitting && <LoadingOverlay message="Menyimpan password baru..." />}
    </div>
  );
}
