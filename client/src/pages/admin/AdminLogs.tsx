import { useCallback, useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { IconSearch } from '../../components/Icons';

interface AdminLog {
  id: number;
  adminId: number | null;
  username: string;
  action: string;
  module: string;
  targetId: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

const MODULE_LABEL: Record<string, string> = {
  all: '全部模块',
  auth: '登录认证',
  assessment: '测评管理',
  response: '答卷管理',
  user: '用户管理',
  unlock_code: '兑换码',
  order: '订单',
  admin: '管理员',
};

const ACTION_LABEL: Record<string, string> = {
  all: '全部操作',
  login: '登录',
  login_fail: '登录失败',
  create: '新增',
  update: '修改',
  delete: '删除',
  restore: '恢复',
  export: '导出',
  revoke: '作废',
};

const ACTION_STYLE: Record<string, string> = {
  login: 'bg-[#eef7ef] text-[#4caf50]',
  login_fail: 'bg-danger/10 text-danger',
  create: 'bg-primary-light text-primary',
  update: 'bg-background text-text-secondary',
  delete: 'bg-danger/10 text-danger',
  restore: 'bg-primary-light text-primary',
  export: 'bg-background text-text-secondary',
  revoke: 'bg-danger/10 text-danger',
};

export default function AdminLogs() {
  const [list, setList] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [module, setModule] = useState('all');
  const [action, setAction] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const pageSize = 20;

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/logs', { params: { page, pageSize, module, action, keyword: keyword || undefined } })
      .then(res => {
        setList(res.data.data.list || []);
        setTotal(res.data.data.total || 0);
      })
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, module, action, keyword]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [module, action, keyword]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">操作日志</h1>
        <div className="text-sm text-text-muted">记录管理后台所有关键操作 · 共 {total} 条</div>
      </div>

      {/* 筛选 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          value={module}
          onChange={e => setModule(e.target.value)}
        >
          {Object.entries(MODULE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          value={action}
          onChange={e => setAction(e.target.value)}
        >
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
          <input
            className="input"
            placeholder="搜索管理员账号或操作内容"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setKeyword(searchInput.trim()); }}
          />
          <button
            className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-sm"
            onClick={() => setKeyword(searchInput.trim())}
          >
            <IconSearch size={15} /> 搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="card py-16 text-center text-text-muted">暂无操作日志</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background/60 text-xs text-text-muted">
                  <th className="px-4 py-3">时间</th>
                  <th className="px-4 py-3">管理员</th>
                  <th className="px-4 py-3">操作</th>
                  <th className="px-4 py-3">模块</th>
                  <th className="px-4 py-3">说明</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {list.map(log => (
                  <tr key={log.id} className="border-b border-border/60 last:border-0 hover:bg-background/40">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                      {new Date(log.createdAt).toLocaleString('zh-CN', { hour12: false })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-mono text-xs text-text-primary">{log.username}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ACTION_STYLE[log.action] || 'bg-background text-text-secondary'}`}>
                        {ACTION_LABEL[log.action] || log.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                      {MODULE_LABEL[log.module] || log.module}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {log.detail || '-'}
                      {log.targetId && <span className="ml-1 text-xs text-text-muted">（#{log.targetId}）</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">{log.ip || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            className="btn-secondary px-4 py-1.5 text-sm disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            上一页
          </button>
          <span className="text-sm text-text-muted">{page} / {totalPages}</span>
          <button
            className="btn-secondary px-4 py-1.5 text-sm disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
