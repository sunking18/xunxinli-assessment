import axios from 'axios';

// C 端用户 token 与管理后台管理员 token 分开存储：
// 两套账号体系独立，后台登录不会顶掉前台登录态，反之亦然。
export const TOKEN_KEY = 'xunxinli_token';
export const ADMIN_TOKEN_KEY = 'xunxinli_admin_token';

function isAdminPath(): boolean {
  return window.location.pathname.startsWith('/admin');
}

export function currentTokenKey(): string {
  return isAdminPath() ? ADMIN_TOKEN_KEY : TOKEN_KEY;
}

export const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

// 请求拦截：按当前所在区域附加对应的 JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem(currentTokenKey());
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
      localStorage.removeItem(currentTokenKey());
      if (!window.location.pathname.startsWith('/admin')) {
        window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      } else if (!window.location.pathname.startsWith('/admin/login')) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem('admin_user');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

export function getErrorMessage(err: any, fallback = '操作失败'): string {
  return err?.response?.data?.message || err?.message || fallback;
}
