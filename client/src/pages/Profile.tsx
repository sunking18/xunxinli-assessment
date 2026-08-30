import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { IconLock, IconLogout, IconUser } from '../components/Icons';

interface UserProfile {
  id: number;
  nickname: string | null;
  displayName: string;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  wechatOpenId: string | null;
  createdAt: string;
  updatedAt: string;
}

// 系统预置 8 个 emoji 头像（后续可替换为设计好的图片 URL）
const PRESET_AVATARS = [
  { emoji: '🐱', color: '#F59E0B' },
  { emoji: '🐶', color: '#EF4444' },
  { emoji: '🦊', color: '#F97316' },
  { emoji: '🐰', color: '#EC4899' },
  { emoji: '🐼', color: '#6B7280' },
  { emoji: '🐨', color: '#8B5CF6' },
  { emoji: '🦁', color: '#EAB308' },
  { emoji: '🐯', color: '#F97316' },
];

const avatarToEmoji = (avatar?: string | null) =>
  avatar?.startsWith('emoji://') ? avatar.slice(8) : null;

const genderText = (g?: string | null) => {
  switch (g) {
    case 'male': return '男';
    case 'female': return '女';
    case 'other': return '其他';
    default: return '-';
  }
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setProfile(res.data.data.user))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectAvatar = async (emoji: string) => {
    try {
      await api.put('/auth/profile', { avatar: `emoji://${emoji}` });
      // 同步更新本地和全局状态
      const me = await api.get('/auth/me');
      setProfile(me.data.data.user);
      await refreshUser();
    } catch (err) {
      alert(getErrorMessage(err, '头像更新失败'));
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6 || newPassword.length > 32) {
      return alert('新密码长度需在 6-32 位之间');
    }
    if (newPassword !== confirmPassword) {
      return alert('两次输入的新密码不一致');
    }
    setPwdSubmitting(true);
    try {
      await api.patch('/auth/password', { oldPassword, newPassword, confirmPassword });
      alert('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
    } catch (err) {
      alert(getErrorMessage(err, '密码修改失败'));
    } finally {
      setPwdSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (confirm('确定退出当前账号吗？')) {
      logout();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const currentEmoji = avatarToEmoji(profile?.avatar || user?.avatar);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 flex items-center gap-2 text-xl font-bold text-text-primary">
        <IconUser size={22} className="text-primary" />
        个人中心
      </h1>

      {/* 基本信息 */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ background: currentEmoji ? `${PRESET_AVATARS.find(a => a.emoji === currentEmoji)?.color || '#E5E7EB'}33` : '#F3F4F6' }}
          >
            {currentEmoji || (profile?.nickname || profile?.displayName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-text-primary">{profile?.nickname || profile?.displayName || '-'}</div>
            <div className="text-sm text-text-muted">
              {profile?.wechatOpenId ? '微信用户' : '注册用户'}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-text-muted">昵称</span>
            <span className="font-medium text-text-primary">{profile?.nickname || '-'}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-text-muted">邮箱</span>
            <span className="font-medium text-text-primary">{profile?.email || '-'}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-text-muted">手机号</span>
            <span className="font-medium text-text-primary">{profile?.phone || '-'}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-text-muted">性别</span>
            <span className="font-medium text-text-primary">{genderText(profile?.gender)}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-text-muted">生日</span>
            <span className="font-medium text-text-primary">{profile?.birthday || '-'}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-text-muted">注册时间</span>
            <span className="font-medium text-text-primary">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleString('zh-CN') : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">最后更新时间</span>
            <span className="font-medium text-text-primary">
              {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString('zh-CN') : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 头像选择 */}
      <div className="card mt-5 p-5">
        <h2 className="mb-3 text-base font-semibold text-text-primary">选择头像</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {PRESET_AVATARS.map(({ emoji, color }) => {
            const selected = currentEmoji === emoji;
            return (
              <button
                key={emoji}
                onClick={() => handleSelectAvatar(emoji)}
                className={`flex aspect-square items-center justify-center rounded-full text-2xl transition ${
                  selected ? 'ring-2 ring-primary ring-offset-2' : 'hover:opacity-80'
                }`}
                style={{ background: `${color}33` }}
                title={`选择头像 ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-text-muted">昵称注册后不可修改，头像可从上方 8 个系统头像中切换。</p>
      </div>

      {/* 修改密码 */}
      <div className="card mt-5 p-5">
        <button
          onClick={() => setShowPassword(v => !v)}
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <IconLock size={18} className="text-primary" />
            重置密码
          </span>
          <span className="text-sm text-text-muted">{showPassword ? '收起' : '展开'}</span>
        </button>

        {showPassword && (
          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">原密码</label>
              <input
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input w-full"
                required
                minLength={6}
                maxLength={32}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <button type="submit" disabled={pwdSubmitting} className="btn-primary w-full">
              {pwdSubmitting ? '保存中...' : '确认修改'}
            </button>
          </form>
        )}
      </div>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/5 py-3 text-sm font-semibold text-danger transition hover:bg-danger/10"
      >
        <IconLogout size={16} />
        退出当前账号
      </button>
    </div>
  );
}
