import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, getErrorMessage } from '../api/client';
import { IconQrCode, IconUser } from '../components/Icons';

declare global {
  interface Window {
    WxLogin?: new (options: Record<string, unknown>) => void;
  }
}

type LoginView = 'qr' | 'wechat' | 'account';

interface WechatConfig {
  enabled: boolean;
  skipWechat: boolean;
  appId: string;
  webLoginEnabled: boolean;
  webAppId?: string;
}

/** 从 returnUrl 提取测评 code 作为 state（如 /fill/lovetri → lovetri），其他情况返回空 */
function stateFor(url: string): string {
  const m = url.match(/^\/fill\/([^/?]+)/);
  return m ? m[1] : '';
}

/** 动态加载微信扫码 JS（内嵌二维码） */
function loadWxScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.WxLogin) return resolve();
    const s = document.createElement('script');
    s.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('微信脚本加载失败'));
    document.body.appendChild(s);
  });
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, login, wechatLogin } = useAuth();

  // 运行环境：手机微信内 / 电脑浏览器 / 手机其他浏览器
  const ua = navigator.userAgent;
  const isWechat = /MicroMessenger/i.test(ua);
  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Windows Phone|HarmonyOS/i.test(ua);
  const isPC = !isWechat && !isMobile;

  // 视图：qr=PC扫码二维码（默认） / wechat=手机微信授权 / account=账号登录（老用户）
  const [view, setView] = useState<LoginView>(isWechat ? 'wechat' : isPC ? 'qr' : 'account');

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [qrError, setQrError] = useState('');
  const [qrKey, setQrKey] = useState(0);

  const [wechatConfig, setWechatConfig] = useState<WechatConfig | null>(null);

  // 上次登录过的微信资料（头像/昵称），用于微信内「快捷登录」卡片展示
  const [lastProfile, setLastProfile] = useState<{ nickname?: string | null; avatar?: string | null } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('wx_last_profile');
      if (raw) setLastProfile(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const params = new URLSearchParams(location.search);
  const returnUrl = params.get('returnUrl') || '/';
  const wxOpenid = params.get('wx_openid');
  const wxUnionId = params.get('wx_unionid');
  const wxNickname = params.get('wx_nickname');
  const wxAvatar = params.get('wx_avatar');

  useEffect(() => {
    api
      .get('/wechat/config')
      .then((res) => setWechatConfig(res.data.data))
      .catch(() =>
        setWechatConfig({ enabled: false, skipWechat: true, appId: '', webLoginEnabled: false }),
      );
  }, []);

  // 用户在微信里取消授权：后端重定向回 ?wx_error=cancelled，这里提示并清掉该参数
  useEffect(() => {
    if (params.get('wx_error') !== 'cancelled') return;
    setError('您取消了微信授权，无法登录，请重新点击「微信快捷登录」');
    const next = new URLSearchParams(location.search);
    next.delete('wx_error');
    const qs = next.toString();
    navigate(qs ? `/login?${qs}` : '/login', { replace: true });
  }, [location.search, navigate, params]);

  // 已登录则跳回
  useEffect(() => {
    if (!loading && user) {
      navigate(returnUrl, { replace: true });
    }
  }, [user, loading, navigate, returnUrl]);

  // 微信授权回调（手机授权 & PC 扫码都会带这些参数回来）：自动建立登录态
  useEffect(() => {
    if (!wxOpenid) return;
    let cancelled = false;
    setSubmitting(true);
    wechatLogin(wxOpenid, wxUnionId || undefined, wxNickname || undefined, wxAvatar || undefined)
      .then(({ user: u }) => {
        if (cancelled) return;
        // 记住本次微信资料，下次打开登录页可直接展示头像 + 昵称
        try {
          localStorage.setItem(
            'wx_last_profile',
            JSON.stringify({ nickname: u.nickname, avatar: u.avatar }),
          );
        } catch {
          /* ignore */
        }
        // 微信昵称已作为账号昵称；仅当微信未返回昵称时才需要手动设置
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
      .finally(() => {
        if (!cancelled) setSubmitting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wxOpenid, wxUnionId, wxNickname, wxAvatar, returnUrl, navigate, wechatLogin]);

  // PC 内嵌微信扫码二维码
  useEffect(() => {
    if (view !== 'qr' || !wechatConfig?.webLoginEnabled) return;
    let cancelled = false;
    setQrError('');

    loadWxScript()
      .then(() => {
        if (cancelled || !window.WxLogin) return;
        const box = document.getElementById('wx-login-iframe');
        if (box) box.innerHTML = ''; // 重新渲染前清空旧 iframe
        new window.WxLogin({
          self_redirect: false, // 扫码确认后整页跳转到回调地址
          id: 'wx-login-iframe',
          appid: wechatConfig.webAppId || wechatConfig.appId,
          scope: 'snsapi_login',
          redirect_uri: encodeURIComponent(`${window.location.origin}/api/wechat/web-callback`),
          state: stateFor(returnUrl),
          style: 'black',
          href: '',
        });
      })
      .catch(() => {
        if (!cancelled) setQrError('二维码加载失败，请点击刷新或使用账号登录');
      });

    return () => {
      cancelled = true;
    };
  }, [view, wechatConfig, qrKey, returnUrl]);

  // 手机微信：跳转公众号网页授权
  const handleWechatLogin = () => {
    setError('');
    if (!wechatConfig?.enabled) {
      setError('微信登录暂未开启，请联系管理员');
      return;
    }
    window.location.href = `/api/wechat/authorize?state=${stateFor(returnUrl)}`;
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!account.trim()) return setError('请输入邮箱或手机号');
    if (!password) return setError('请输入密码');

    setSubmitting(true);
    try {
      await login(account.trim(), password);
      navigate(returnUrl, { replace: true });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // 右上角切换入口仅 PC 显示（二维码登录 ⇄ 账号登录）
  // 微信内必然是登录态，直接快捷登录，不再提供账号/扫码选项
  const showToggle = isPC;
  const toggleView = () => {
    setError('');
    setView((v) => (v === 'account' ? (isWechat ? 'wechat' : 'qr') : 'account'));
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">欢迎登录</h1>
          <p className="mt-2 text-sm text-text-muted">登录后即可开始测评</p>
        </div>

        <div className="card relative overflow-hidden p-8">
          {/* 右上角切换：二维码登录 ⇄ 账号登录 */}
          {showToggle && (
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleView}
                className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
              >
                {view === 'account' ? '扫码登录' : '账号登录'}
                <span aria-hidden className="text-[10px] leading-none">▸</span>
              </button>
              <span className="text-primary/80">
                {view === 'account' ? <IconQrCode size={20} /> : <IconUser size={20} />}
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          {/* ===== PC 微信扫码二维码 ===== */}
          {view === 'qr' && (
            <div className="flex flex-col items-center">
              <h2 className="text-lg font-bold text-text-primary">二维码登录</h2>

              {wechatConfig === null ? (
                <div className="my-10 h-56 w-56 animate-pulse rounded-lg bg-background" />
              ) : wechatConfig.webLoginEnabled ? (
                <>
                  <div
                    id="wx-login-iframe"
                    className="mt-8 mb-4 flex h-[420px] w-[300px] items-center justify-center"
                  />
                  {qrError && <p className="mb-2 text-xs text-red-500">{qrError}</p>}
                  <button
                    type="button"
                    onClick={() => setQrKey((k) => k + 1)}
                    className="text-xs text-text-muted transition hover:text-primary"
                  >
                    刷新二维码
                  </button>
                </>
              ) : (
                <div className="my-10 text-center">
                  <p className="text-sm text-text-secondary">微信扫码登录暂未开启</p>
                  <button
                    type="button"
                    onClick={toggleView}
                    className="mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    使用账号登录 →
                  </button>
                </div>
              )}

              <p className="mt-6 text-xs text-text-muted">微信扫码 · 安全登录</p>
            </div>
          )}

          {/* ===== 手机微信内：快捷登录（直接展示微信头像昵称 + 绿色按钮）===== */}
          {view === 'wechat' && (
            <div className="flex flex-col items-center py-2">
              <h2 className="mb-6 text-lg font-bold text-text-primary">微信快捷登录</h2>

              {/* 微信账号卡片：头像 + 昵称 */}
              <div className="flex w-full items-center gap-3 rounded-xl bg-background p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light text-xl">
                  {lastProfile?.avatar ? (
                    lastProfile.avatar.startsWith('emoji://') ? (
                      <span>{lastProfile.avatar.slice(8)}</span>
                    ) : (
                      <img src={lastProfile.avatar} alt="" className="h-full w-full object-cover" />
                    )
                  ) : (
                    <IconUser size={22} className="text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-text-primary">
                    {lastProfile?.nickname || '微信用户'}
                  </div>
                  <div className="text-xs text-text-muted">
                    {lastProfile?.nickname ? '上次登录的微信账号' : '点击下方按钮授权登录'}
                  </div>
                </div>
              </div>

              {/* 微信品牌绿快捷登录按钮 */}
              <button
                type="button"
                onClick={handleWechatLogin}
                disabled={submitting || !wechatConfig?.enabled}
                className="mt-6 w-full rounded-xl bg-[#07c160] py-3 text-base font-semibold text-white shadow-lg shadow-green-500/20 transition hover:brightness-105 disabled:opacity-60"
              >
                {submitting ? '登录中...' : '微信快捷登录'}
              </button>

              {!wechatConfig?.enabled && (
                <p className="mt-3 text-center text-xs text-text-muted">
                  微信登录暂未开启，请联系管理员
                </p>
              )}
            </div>
          )}

          {/* ===== 账号登录（仅存量账号，已停止开放注册）===== */}
          {view === 'account' && (
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">账号登录</h2>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  邮箱 / 手机号
                </label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="请输入邮箱或手机号"
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
                  placeholder="请输入密码"
                  className="input w-full"
                  required
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? '登录中...' : '登录'}
              </button>
              <p className="text-center text-xs leading-relaxed text-text-muted">
                新用户请使用微信扫码登录（已停止账号注册）
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
