import { useState, type FormEvent } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button/Button';
import FormField from '../components/FormField/FormField';
import styles from './ChangePassword.module.scss';

const MIN_LENGTH = 8;

export default function ChangePassword() {
  const { logout, refreshAppUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_LENGTH) {
      setError(`Password baru minimal ${MIN_LENGTH} karakter.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

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

        <form className={styles.form} onSubmit={handleSubmit}>
          <FormField label="Password Baru" htmlFor="new-password" help={`Minimal ${MIN_LENGTH} karakter`}>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </FormField>
          <FormField label="Konfirmasi Password Baru" htmlFor="confirm-password">
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </FormField>
          <Button type="submit" variant="primary" disabled={submitting} className={styles.submitButton}>
            {submitting ? 'Menyimpan...' : 'Simpan Password Baru'}
          </Button>
        </form>

        <button type="button" className={styles.logoutLink} onClick={logout}>
          Bukan Anda? Keluar
        </button>
      </div>
    </div>
  );
}
