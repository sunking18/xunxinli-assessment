import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';
import { TOKEN_KEY } from '../../api/client';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const autoLogin = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.post('/auth/login', { account: 'admin', password: 'admin123' });
        localStorage.setItem(TOKEN_KEY, res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));
        navigate('/admin');
      } catch (err) {
        setError(getErrorMessage(err, '自动登录失败'));
        setLoading(false);
      }
    };

    autoLogin();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/xunxinli-avatar-cream.png" alt="寻心理" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-lg" />
          <h1 className="mt-4 text-2xl font-bold text-text-primary">寻心理测评平台</h1>
          <p className="mt-1 text-sm text-text-secondary">管理后台登录</p>
        </div>

        <div className="card p-8">
          {error ? (
            <div className="rounded-lg bg-danger/10 px-4 py-2.5 text-center text-sm text-danger">{error}</div>
          ) : (
            <div className="py-4 text-center text-text-secondary">
              {loading && '正在进入管理后台...'}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-text-muted transition hover:text-primary">← 返回测评首页</Link>
        </div>
      </div>
    </div>
  );
}
