import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Tự động refresh access token khi nhận 401, trừ /auth/me (dùng để check auth status)
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCheck = original.url?.includes('/auth/me');
    if (error.response?.status === 401 && !original._retry && !isAuthCheck) {
      original._retry = true;
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        return client(original);
      } catch {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default client;
