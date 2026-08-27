import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';
import { IconLock, IconUser } from '../../components/Icons';
import { TOKEN_KEY } from '../../api/client';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem(TOKEN_KEY, res.data.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.data.user));
      navigate('/admin');
    } catch (err) {
      setError(getErrorMessage(err, '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/xunxinli-avatar-cream.png" alt="寻心理" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-text-primary">寻心理测评平台</h1>
          <p className="mt-1 text-sm text-text-secondary">管理后台登录</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">用户名</label>
              <div className="relative">
                <IconUser className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  className="input pl-10"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">密码</label>
              <div className="relative">
                <IconLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="请输入密码"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>
            )}

            <button className="btn-primary w-full py-3" disabled={loading}>
              {loading ? '登录中...' : '登 录'}
            </button>

            <div className="rounded-lg bg-background px-4 py-3 text-xs text-text-muted">
              默认管理员账号：<code className="font-mono">admin</code> / <code className="font-mono">admin123</code>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-text-muted transition hover:text-primary">← 返回测评首页</Link>
        </div>
      </div>
    </div>
  );
}
