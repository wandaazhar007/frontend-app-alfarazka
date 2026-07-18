import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { auth } from '../config/firebase';
import Button from '../components/Button/Button';
import FormField from '../components/FormField/FormField';
import LoadingOverlay from '../components/LoadingOverlay/LoadingOverlay';
import styles from './Login.module.scss';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_STORAGE_KEY = 'login-email';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'lupa-password'>('login');
  // Email di-persist ke localStorage supaya tidak perlu ketik ulang tiap kali buka
  // halaman login (mis. setelah logout) — password TIDAK ikut di-persist (sensitif).
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_STORAGE_KEY) ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  }, [email]);

  const switchMode = (next: 'login' | 'lupa-password') => {
    setMode(next);
    setErrors({});
    setError(null);
    setSuccessMessage(null);
  };

  const validateLogin = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!email.trim()) nextErrors.email = 'Email wajib diisi.';
    else if (!EMAIL_REGEX.test(email.trim())) nextErrors.email = 'Format email tidak valid.';
    if (!password) nextErrors.password = 'Password wajib diisi.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateForgot = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!email.trim()) nextErrors.email = 'Email wajib diisi.';
    else if (!EMAIL_REGEX.test(email.trim())) nextErrors.email = 'Format email tidak valid.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

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
    if (!validateForgot()) return;

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

              <form className={styles.form} onSubmit={handleLogin} noValidate>
                <FormField label="Email" htmlFor="email" required error={errors.email}>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    autoComplete="email"
                  />
                </FormField>
                <FormField label="Password" htmlFor="password" required error={errors.password}>
                  <div className={styles.passwordField}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
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

              <form className={styles.form} onSubmit={handleForgotPassword} noValidate>
                <FormField label="Email" htmlFor="forgot-email" required error={errors.email}>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    autoComplete="email"
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
