import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('auth-store');
  if (stored) {
    const { state } = JSON.parse(stored);
    if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth-store');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
