import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  IconHome, IconClipboardList, IconHistory, IconMenu, IconUser,
} from './Icons';

interface MenuItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const MENU: MenuItem[] = [
  { to: '/', label: '全部测评', icon: <IconHome size={20} /> },
  { to: '/pending', label: '待完成', icon: <IconClipboardList size={20} /> },
  { to: '/my', label: '我的报告', icon: <IconHistory size={20} /> },
  { to: '/profile', label: '个人中心', icon: <IconUser size={20} /> },
];

export default function UserLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const handleStart = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* 桌面端侧边栏 */}
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar-bg shadow-soft lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <img src="/xunxinli-avatar-cream.png" alt="寻心理" className="h-9 w-9 rounded-xl object-cover shadow-soft" />
          <div>
            <div className="text-base font-bold leading-tight text-text-primary">寻心理</div>
            <div className="text-xs text-text-muted">积极心理测评</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-3 px-3 text-xs font-medium text-text-muted">用户菜单</div>
          <ul className="space-y-1.5">
            {MENU.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={() =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive(item.to)
                        ? 'bg-primary-light text-primary shadow-sm'
                        : 'text-text-secondary hover:bg-background hover:text-text-primary'
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          {user && (
            <div
              onClick={() => navigate('/profile')}
              title="进入个人中心"
              className="mb-3 flex cursor-pointer items-center gap-2 rounded-xl px-1 py-1.5 transition hover:bg-background"
            >
              {user.avatar?.startsWith('emoji://') ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-lg">
                  {user.avatar.slice(8)}
                </div>
              ) : user.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {(user.nickname || user.username || 'U').charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-primary">{user.nickname || user.username}</div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    logout();
                  }}
                  className="text-xs text-text-muted hover:text-primary"
                >
                  退出登录
                </button>
              </div>
            </div>
          )}
          <button
            onClick={handleStart}
            className="btn-primary w-full py-2.5 text-sm"
          >
            开始测评
          </button>
          <div className="mt-3 text-center text-xs">
            <p className="font-medium text-text-secondary">向内寻，向外生</p>
            <a
              href="https://xunxinli.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-block text-primary hover:underline"
            >
              xunxinli.com
            </a>
          </div>
        </div>
      </aside>

      {/* 移动端顶部栏 */}
      <header className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-sidebar-bg px-4 shadow-sm lg:hidden">
        <div className="flex items-center gap-2.5">
          <img src="/xunxinli-avatar-cream.png" alt="寻心理" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-bold text-text-primary">寻心理</span>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => navigate('/profile')}
              title="进入个人中心"
              className="flex max-w-[120px] items-center gap-1.5 truncate text-xs text-text-muted transition hover:text-primary"
            >
              {user.avatar?.startsWith('emoji://') ? (
                <span className="text-base leading-none">{user.avatar.slice(8)}</span>
              ) : user.avatar ? (
                <img src={user.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {(user.nickname || user.username || 'U').charAt(0)}
                </span>
              )}
              <span className="truncate">{user.nickname || user.username}</span>
            </button>
          )}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="rounded-lg p-2 text-text-secondary hover:bg-background"
          >
            <IconMenu size={20} />
          </button>
        </div>
      </header>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-14 bottom-0 w-56 bg-sidebar-bg shadow-xl">
            <nav className="p-3">
              <ul className="space-y-1">
                {MENU.map(item => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={() =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive(item.to)
                            ? 'bg-primary-light text-primary'
                            : 'text-text-secondary hover:bg-background hover:text-text-primary'
                        }`
                      }
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
              <button
                onClick={handleStart}
                className="btn-primary w-full py-2.5 text-sm"
              >
                开始测评
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="flex-1 lg:ml-64">
        <div className="min-h-screen px-4 pb-12 pt-16 lg:px-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
