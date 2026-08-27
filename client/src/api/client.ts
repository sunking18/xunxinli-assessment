import axios from 'axios';

export const TOKEN_KEY = 'xunxinli_token';

export const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

// 请求拦截：自动附加 JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一错误处理与 401 跳转
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/admin')) {
        window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      } else if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

export function getErrorMessage(err: any, fallback = '操作失败'): string {
  return err?.response?.data?.message || err?.message || fallback;
}
