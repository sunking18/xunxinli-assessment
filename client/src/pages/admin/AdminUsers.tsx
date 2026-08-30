import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { IconSearch, IconUsers } from '../../components/Icons';

interface UserItem {
  id: number;
  username: string;
  displayName: string;
  nickname: string | null;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  wechatOpenId: string | null;
  wechatName: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

type SortField = 'createdAt' | 'updatedAt' | 'id' | 'nickname';
type SortOrder = 'asc' | 'desc';

const formatDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const load = () => {
    setLoading(true);
    api
      .get('/admin/users', {
        params: {
          keyword: keyword.trim() || undefined,
          sortBy,
          sortOrder,
        },
      })
      .then(res => setUsers(res.data.data || []))
      .catch(err => alert(getErrorMessage(err, '加载用户列表失败')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'createdAt' || field === 'updatedAt' ? 'desc' : 'asc');
    }
  };

  const displayNickname = (u: UserItem) => u.nickname || u.displayName || '-';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">用户管理</h1>
          <div className="text-sm text-text-muted">共 {users.length} 位注册用户 · 含微信授权与邮箱注册</div>
        </div>
      </div>

      {/* 搜索与排序 */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索昵称 / 用户名 / 邮箱 / 手机号"
            className="input w-full pl-9"
          />
        </form>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSearch}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap"
          >
            <IconSearch size={16} />
            搜索
          </button>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortField)}
            className="input py-2 text-sm"
          >
            <option value="createdAt">按注册时间</option>
            <option value="updatedAt">按更新时间</option>
            <option value="id">按用户ID</option>
            <option value="nickname">按昵称</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
            className="input flex items-center gap-1 px-3 py-2 text-sm"
            title={sortOrder === 'asc' ? '升序' : '降序'}
          >
            {sortOrder === 'asc' ? '升序 ↑' : '降序 ↓'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="card py-16 text-center text-text-muted">
          <IconUsers size={40} className="mx-auto mb-3 text-text-muted/50" />
          <div>暂无用户</div>
          <div className="mt-1 text-sm">用户完成登录或注册后将自动出现在这里</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background/50 text-text-secondary">
                <tr>
                  <th className="cursor-pointer px-4 py-3 font-semibold hover:text-primary" onClick={() => toggleSort('id')}>
                    用户ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 font-semibold">昵称</th>
                  <th className="px-4 py-3 font-semibold">微信称呼</th>
                  <th className="px-4 py-3 font-semibold">邮箱 / 手机号</th>
                  <th
                    className="cursor-pointer px-4 py-3 font-semibold hover:text-primary"
                    onClick={() => toggleSort('createdAt')}
                  >
                    注册时间 {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 font-semibold hover:text-primary"
                    onClick={() => toggleSort('updatedAt')}
                  >
                    更新时间 {sortBy === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 font-mono text-text-secondary">#{u.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                            {(displayNickname(u) || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-text-primary">{displayNickname(u)}</div>
                          <div className="text-xs text-text-muted">{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.wechatName ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                          <span>微信</span>
                          {u.wechatName}
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {u.email || u.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(u.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
