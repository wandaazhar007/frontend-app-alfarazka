import axios from 'axios';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { emitToast } from '../utils/toastBus';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;

  if (currentUser) {
    const idToken = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${idToken}`;
  }

  return config;
});

// Auto token refresh is handled by the Firebase SDK via getIdToken() above — if
// we still get a 401, the token is truly invalid (user was disabled/revoked).
// Do a clean logout and redirect to /login — don't leave the user stuck
// on an error page (docs/07_DESIGN_SYSTEM.md §12).

let sessionExpiredHandled = false;

api.interceptors.response.use(
  (response) => {
    sessionExpiredHandled = false;
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && !sessionExpiredHandled) {
      sessionExpiredHandled = true;
      emitToast('danger', 'Sesi Anda telah berakhir. Silakan masuk kembali.');
      await signOut(auth);
    }
    return Promise.reject(error);
  }
);

export default api;
