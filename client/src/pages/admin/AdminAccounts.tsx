import { useCallback, useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { IconBriefcase, IconPlus, IconTrash } from '../../components/Icons';

interface AdminAccount {
  id: number;
  username: string;
  displayName: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

const emptyForm = { username: '', displayName: '', password: '' };

export default function AdminAccounts() {
  const [list, setList] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: number; role: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isSuper = me?.role === 'super';

  useEffect(() => {
    const cached = localStorage.getItem('admin_user');
    if (cached) {
      try { setMe(JSON.parse(cached)); } catch { /* ignore */ }
    }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/admins')
      .then(res => setList(res.data.data.list || []))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setError('');
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(form.username)) {
      setError('账号需为 3-32 位字母、数字或下划线');
      return;
    }
    if (form.password.length < 6 || form.password.length > 32) {
      setError('密码长度需在 6-32 位之间');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/admins', form);
      setCreateOpen(false);
      setForm({ ...emptyForm });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (item: AdminAccount) => {
    const next = item.status === 'active' ? 'disabled' : 'active';
    if (!confirm(`确定${next === 'disabled' ? '停用' : '启用'}管理员「${item.username}」吗？`)) return;
    try {
      await api.put(`/admin/admins/${item.id}`, { status: next });
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const resetPassword = async (item: AdminAccount) => {
    const pwd = prompt(`请输入「${item.username}」的新密码（6-32 位）`);
    if (!pwd) return;
    if (pwd.length < 6 || pwd.length > 32) {
      alert('密码长度需在 6-32 位之间');
      return;
    }
    try {
      await api.put(`/admin/admins/${item.id}`, { password: pwd });
      alert('密码已重置');
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const remove = async (item: AdminAccount) => {
    if (!confirm(`确定删除管理员「${item.username}」吗？该操作不可恢复。`)) return;
    try {
      await api.delete(`/admin/admins/${item.id}`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">管理员账号</h1>
          <div className="text-sm text-text-muted">
            管理后台账号体系独立于前台用户，不开放注册、不支持邮箱 / 手机号登录
          </div>
        </div>
        {isSuper && (
          <button className="btn-primary flex items-center gap-2" onClick={() => { setError(''); setCreateOpen(true); }}>
            <IconPlus size={16} /> 新增管理员
          </button>
        )}
      </div>

      <div className="mb-5 rounded-xl bg-primary-light/60 px-4 py-3 text-xs leading-relaxed text-text-secondary">
        <div className="flex items-center gap-1.5 font-medium text-primary">
          <IconBriefcase size={14} /> 账号来源说明
        </div>
        <div className="mt-1">
          超级管理员（role=super）的账号与密码由服务端环境变量 <code className="font-mono">ADMIN_USERNAME</code> /
          <code className="font-mono">ADMIN_PASSWORD</code> 配置，改配置后下次登录立即生效，不在此处修改。
          其他管理员账号在此新增，所有后台关键操作都会记入「操作日志」。
        </div>
      </div>

      {error && !createOpen && (
        <div className="mb-4 rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="card py-16 text-center text-text-muted">暂无管理员账号</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-background/60 text-xs text-text-muted">
                <th className="px-4 py-3">账号</th>
                <th className="px-4 py-3">显示名称</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">最后登录</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id} className="border-b border-border/60 last:border-0 hover:bg-background/40">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-text-primary">{item.username}</span>
                    {me?.id === item.id && (
                      <span className="ml-2 rounded bg-primary-light px-1.5 py-0.5 text-[10px] text-primary">当前登录</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{item.displayName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      item.role === 'super' ? 'bg-primary-light text-primary' : 'bg-background text-text-secondary'
                    }`}>
                      {item.role === 'super' ? '超级管理员' : '管理员'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      item.status === 'active' ? 'bg-[#eef7ef] text-[#4caf50]' : 'bg-danger/10 text-danger'
                    }`}>
                      {item.status === 'active' ? '正常' : '已停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {item.lastLoginAt
                      ? new Date(item.lastLoginAt).toLocaleString('zh-CN', { hour12: false })
                      : '从未登录'}
                    {item.lastLoginIp && <span className="ml-1">（{item.lastLoginIp}）</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.role === 'super' ? (
                      <span className="text-xs text-text-muted">密码由服务端配置</span>
                    ) : isSuper ? (
                      <div className="flex items-center justify-end gap-3">
                        <button className="text-xs font-medium text-primary hover:underline" onClick={() => resetPassword(item)}>
                          重置密码
                        </button>
                        <button
                          className={`text-xs font-medium hover:underline ${item.status === 'active' ? 'text-danger' : 'text-[#4caf50]'}`}
                          onClick={() => toggleStatus(item)}
                        >
                          {item.status === 'active' ? '停用' : '启用'}
                        </button>
                        <button className="text-text-muted transition hover:text-danger" onClick={() => remove(item)} title="删除">
                          <IconTrash size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增管理员弹窗 */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => !submitting && setCreateOpen(false)}>
          <div className="w-full max-w-md animate-[fadeIn_.25s_ease] rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">新增管理员</h3>
              <button className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-background" onClick={() => !submitting && setCreateOpen(false)}>
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="label">管理员账号</label>
                <input
                  className="input"
                  placeholder="3-32 位字母、数字或下划线"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.trim() }))}
                />
              </div>
              <div>
                <label className="label">显示名称</label>
                <input
                  className="input"
                  placeholder="用于后台展示，可留空"
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">初始密码</label>
                <input
                  type="password"
                  className="input"
                  placeholder="6-32 位"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>

            {error && <div className="mt-4 rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

            <button className="btn-primary mt-5 w-full py-2.5" onClick={create} disabled={submitting}>
              {submitting ? '创建中...' : '创建管理员'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
