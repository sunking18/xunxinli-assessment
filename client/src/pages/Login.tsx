import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, getErrorMessage } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, login, wechatLogin, setToken } = useAuth();

  const [tab, setTab] = useState<'wechat' | 'account'>('wechat');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registering, setRegistering] = useState(false);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [wechatConfig, setWechatConfig] = useState<{ enabled: boolean; skipWechat: boolean; appId: string } | null>(null);

  const params = new URLSearchParams(location.search);
  const returnUrl = params.get('returnUrl') || '/';
  const wxOpenid = params.get('wx_openid');
  const wxNickname = params.get('wx_nickname');
  const wxAvatar = params.get('wx_avatar');

  useEffect(() => {
    api
      .get('/wechat/config')
      .then((res) => setWechatConfig(res.data.data))
      .catch(() => setWechatConfig({ enabled: false, skipWechat: true, appId: '' }));
  }, []);

  // 已登录则跳回
  useEffect(() => {
    if (!loading && user) {
      navigate(returnUrl, { replace: true });
    }
  }, [user, loading, navigate, returnUrl]);

  // 处理微信授权回调参数
  useEffect(() => {
    if (!wxOpenid) return;
    let cancelled = false;
    setSubmitting(true);
    wechatLogin(wxOpenid, wxNickname || undefined, wxAvatar || undefined)
      .then(({ user: u }) => {
        if (cancelled) return;
        if (!u.nickname) {
          navigate(`/set-nickname?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
        } else {
          navigate(returnUrl, { replace: true });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
      })
      .finally(() => setSubmitting(false));
    return () => {
      cancelled = true;
    };
  }, [wxOpenid, wxNickname, wxAvatar, returnUrl, navigate, wechatLogin]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (registering) {
      if (!nickname.trim()) return setError('请输入昵称');
      if (!email.trim()) return setError('请输入邮箱');
      if (!phone.trim()) return setError('请输入电话');
    }
    setSubmitting(true);
    try {
      const { user: u } = registering
        ? await api
            .post('/auth/register', { username, password, nickname, email, phone, gender, birthday })
            .then((r) => r.data.data)
        : await login(username, password);
      // 账号注册/登录成功后直接返回目标页，不再跳转设置昵称页
      navigate(returnUrl, { replace: true });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWechatLogin = async () => {
    setError('');
    if (wechatConfig?.enabled) {
      // 真实微信授权：跳转到后端授权入口，由后端拼接 redirect_uri 并跳转到微信
      const state = encodeURIComponent(returnUrl.replace('/fill/', ''));
      window.location.href = `/api/wechat/authorize?state=${state}`;
      return;
    }
    // 本地模拟登录
    if (!nickname.trim()) {
      setError('请输入昵称后再登录');
      return;
    }
    setSubmitting(true);
    try {
      const openid = `wx_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const { user: u } = await wechatLogin(openid, nickname.trim());
      if (!u.nickname) {
        navigate(`/set-nickname?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
      } else {
        navigate(returnUrl, { replace: true });
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">欢迎登录</h1>
          <p className="mt-2 text-sm text-text-muted">登录后即可开始测评</p>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setTab('wechat')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'wechat' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              微信登录
            </button>
            <button
              type="button"
              onClick={() => setTab('account')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'account' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              账号登录
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {tab === 'wechat' ? (
              <div className="space-y-4">
                {wechatConfig?.enabled ? (
                  <>
                    <button
                      type="button"
                      onClick={handleWechatLogin}
                      disabled={submitting}
                      className="btn-primary w-full"
                    >
                      {submitting ? '跳转中...' : '微信登录'}
                    </button>
                    <p className="text-center text-sm text-text-muted">
                      点击下方按钮将跳转至微信授权页面
                    </p>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">
                        昵称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="请输入您的昵称"
                        className="input w-full"
                      />
                      <p className="mt-1 text-xs text-text-muted">本地测试：输入昵称后点击下方按钮即可模拟微信登录</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleWechatLogin}
                      disabled={submitting}
                      className="btn-primary w-full"
                    >
                      {submitting ? '登录中...' : '微信登录（本地模拟）'}
                    </button>
                    <p className="text-center text-xs text-text-muted">正式上线后配置微信 AppID 即可跳转授权</p>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">账号</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>
                {registering && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">
                        昵称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="用于报告中的称呼"
                        className="input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">
                        邮箱 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">
                        电话 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="13800138000"
                        className="input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">性别</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="input w-full"
                      >
                        <option value="">请选择</option>
                        <option value="male">男</option>
                        <option value="female">女</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">生日</label>
                      <input
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="input w-full"
                      />
                    </div>
                  </>
                )}
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? '处理中...' : registering ? '注册并登录' : '登录'}
                </button>
                <div className="flex justify-center text-xs">
                  <button
                    type="button"
                    onClick={() => setRegistering((v) => !v)}
                    className="text-primary hover:underline"
                  >
                    {registering ? '已有账号？去登录' : '没有账号？去注册'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
