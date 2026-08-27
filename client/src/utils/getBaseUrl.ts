/**
 * 获取应用基础 URL：
 * - 优先读取环境变量 VITE_APP_BASE_URL（用于本地手机扫码测试或指定生产域名）
 * - 未配置时回退到当前 window.location.origin
 *
 * 使用方式：在 client 目录的 .env.local 中写入
 *   VITE_APP_BASE_URL=http://192.168.x.x:5173
 * 然后重启 Vite 服务。
 */
export function getBaseUrl(): string {
  const env = import.meta.env.VITE_APP_BASE_URL;
  if (env && typeof env === 'string') {
    return env.trim().replace(/\/$/, '');
  }
  return window.location.origin;
}
