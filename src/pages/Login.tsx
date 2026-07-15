import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import Button from '../components/Button/Button';
import FormField from '../components/FormField/FormField';
import LoadingOverlay from '../components/LoadingOverlay/LoadingOverlay';
import styles from './Login.module.scss';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'lupa-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const switchMode = (next: 'login' | 'lupa-password') => {
    setMode(next);
    setError(null);
    setSuccessMessage(null);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const redirectTo = (location.state as { from?: string })?.from ?? '/';
      navigate(redirectTo, { replace: true });
    } catch {
      setError('Email atau password salah. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Link reset password sudah dikirim. Silakan cek email Anda.');
    } catch {
      setError('Gagal mengirim link reset. Pastikan email sudah benar, lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <div className={styles.logoCircle}>
            <img src="/logo-alfarazka-bakery.png" alt="Alfarazka Bakery" />
          </div>
          <p className={styles.tagline}>Kelola penjualan bakery Anda, dari pagi sampai tutup buku.</p>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.card}>
          <img className={styles.smallLogo} src="/logo-alfarazka-bakery.png" alt="Alfarazka Bakery" />

          {mode === 'login' ? (
            <>
              <h1 className={styles.title}>Masuk ke Alfarazka Bakery</h1>

              {error && <div className={styles.errorBox}>{error}</div>}

              <form className={styles.form} onSubmit={handleLogin}>
                <FormField label="Email" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </FormField>
                <FormField label="Password" htmlFor="password">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </FormField>
                <Button type="submit" variant="primary" disabled={submitting} className={styles.submitButton}>
                  {submitting ? 'Memproses...' : 'Masuk'}
                </Button>
              </form>

              <button type="button" className={styles.linkButton} onClick={() => switchMode('lupa-password')}>
                Lupa password?
              </button>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Reset Password</h1>
              <p className={styles.subtitle}>Masukkan email akun Anda, kami akan kirim link untuk atur ulang password.</p>

              {error && <div className={styles.errorBox}>{error}</div>}
              {successMessage && <div className={styles.successBox}>{successMessage}</div>}

              <form className={styles.form} onSubmit={handleForgotPassword}>
                <FormField label="Email" htmlFor="forgot-email">
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </FormField>
                <Button type="submit" variant="primary" disabled={submitting} className={styles.submitButton}>
                  {submitting ? 'Memproses...' : 'Kirim Link Reset'}
                </Button>
              </form>

              <button type="button" className={styles.linkButton} onClick={() => switchMode('login')}>
                Kembali ke Masuk
              </button>
            </>
          )}
        </div>
      </div>

      {submitting && <LoadingOverlay message={mode === 'login' ? 'Memproses login...' : 'Mengirim link reset...'} />}
    </div>
  );
}
