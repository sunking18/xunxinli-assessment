import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import {
  IconDashboard, IconClipboard, IconDatabase,
  IconShare, IconFileText, IconLogout, IconQrCode, IconLock,
} from '../../components/Icons';

interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

const menuGroups = [
  {
    title: '主菜单',
    items: [
      { to: '/admin', label: '数据概览', icon: IconDashboard, end: true },
      { to: '/admin/assessments', label: '测评管理', icon: IconClipboard, end: false },
    ],
  },
  {
    title: '数据与分析',
    items: [
      { to: '/admin/responses', label: '答卷管理', icon: IconDatabase, end: false },
      { to: '/admin/unlock-codes', label: '深度版解锁管理', icon: IconLock, end: false },
    ],
  },
  {
    title: '分发',
    items: [
      { to: '/admin/distribute', label: '测评分发', icon: IconShare, end: false },
    ],
  },
  {
    title: 'AI 报告',
    items: [
      { to: '/admin/reports', label: '报告列表', icon: IconFileText, end: false },
    ],
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('user');
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch { /* ignore */ }
    }
    // 校验 token 有效性
    api.get('/auth/me')
      .then(res => {
        const u = res.data.data;
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/admin/login');
      });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* 侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[260px] flex-col border-r border-border bg-sidebar-bg max-lg:w-[200px]">
        {/* Logo */}
        <div className="border-b border-border p-5">
          <div className="flex items-center gap-2.5">
            <img src="/xunxinli-avatar-cream.png" alt="寻心理" className="h-9 w-9 rounded-xl object-cover" />
            <div>
              <div className="text-sm font-bold tracking-tight text-text-primary">寻心理测评平台</div>
              <div className="text-xs text-text-muted">专业心理测评平台</div>
            </div>
          </div>
        </div>

        {/* 分组导航 */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {menuGroups.map(group => (
            <div key={group.title}>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted/70">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.items.map(item => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                          isActive ? 'bg-primary-light font-medium text-primary' : 'text-text-secondary hover:bg-background hover:text-text-primary'
                        }`
                      }
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* 用户信息 */}
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
              {(user?.displayName || user?.username || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text-primary">{user?.displayName || '管理员'}</div>
              <div className="truncate text-xs text-text-muted">{user?.role === 'admin' ? '管理员' : '编辑'}</div>
            </div>
          </div>
          <Link to="/" className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted transition hover:bg-background hover:text-text-primary">
            <IconQrCode size={15} />
            访问测评首页
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted transition hover:bg-danger/10 hover:text-danger">
            <IconLogout size={15} />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="ml-[260px] min-w-0 flex-1 overflow-x-hidden p-6 max-lg:ml-[200px]">
        <Outlet />
      </main>
    </div>
  );
}
