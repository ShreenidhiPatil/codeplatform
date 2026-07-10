import axios from 'axios';

// Render Django Backend URL
export const BASE_URL = 'https://codeplatform.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Auto refresh access token on 401 once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = sessionStorage.getItem('refresh_token');

      if (refresh) {
        try {
          const res = await axios.post(
            `${BASE_URL}/auth/login/refresh/`,
            { refresh }
          );

          sessionStorage.setItem('access_token', res.data.access);

          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;

          return api(originalRequest);
        } catch (e) {
          sessionStorage.clear();
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;