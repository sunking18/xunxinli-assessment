import { useCallback, useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { IconCopy, IconLock, IconClipboardList, IconPlus } from '../../components/Icons';

interface UnlockCode {
  id: number;
  code: string;
  status: 'unused' | 'used' | 'revoked';
  amount: number;
  usedByResponseId: number | null;
  usedAt: string | null;
  createdAt: string;
}

interface Order {
  id: number;
  orderNo: string;
  amount: number;
  channel: string;
  status: string;
  response: { id: number; resultType: string; mode: string; pairCode: string } | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  unused: { label: '未使用', cls: 'bg-[#eef7ef] text-[#4caf50]' },
  used: { label: '已使用', cls: 'bg-primary-light text-primary' },
  revoked: { label: '已作废', cls: 'bg-danger/10 text-danger' },
};

const CHANNEL_MAP: Record<string, string> = { wechat: '微信支付', code: '兑换码' };

export default function AdminUnlockCodes() {
  const [tab, setTab] = useState<'codes' | 'orders'>('codes');
  const [codes, setCodes] = useState<UnlockCode[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [genOpen, setGenOpen] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [genAmount, setGenAmount] = useState(9.9);
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string[]>([]);

  const pageSize = 15;

  const loadCodes = useCallback(() => {
    setLoading(true);
    api.get('/admin/unlock-codes', { params: { page, pageSize, status: statusFilter } })
      .then(res => {
        setCodes(res.data.data.list || []);
        setTotal(res.data.data.total || 0);
      })
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  const loadOrders = useCallback(() => {
    setLoading(true);
    api.get('/admin/orders', { params: { page, pageSize } })
      .then(res => {
        setOrders(res.data.data.list || []);
        setTotal(res.data.data.total || 0);
      })
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    if (tab === 'codes') loadCodes();
    else loadOrders();
  }, [tab, loadCodes, loadOrders]);

  useEffect(() => { setPage(1); }, [tab, statusFilter]);

  const generate = async () => {
    setGenLoading(true);
    setGenResult([]);
    try {
      const res = await api.post('/admin/unlock-codes/generate', { count: genCount, amount: genAmount });
      setGenResult(res.data.data.codes || []);
      loadCodes();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setGenLoading(false);
    }
  };

  const revoke = async (id: number) => {
    if (!confirm('确定作废该兑换码吗？作废后无法恢复。')) return;
    try {
      await api.post(`/admin/unlock-codes/${id}/revoke`);
      loadCodes();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const copyAll = () => {
    const text = genResult.join('\n');
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => alert('已复制全部兑换码'),
      () => alert('复制失败，请手动选择复制')
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const stats = (() => {
    const used = codes.filter(c => c.status === 'used').length;
    const revoked = codes.filter(c => c.status === 'revoked').length;
    return { used, revoked, available: codes.length - used - revoked };
  })();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">深度版解锁管理</h1>
          <div className="text-sm text-text-muted">兑换码管理 · 微信支付订单 · 共 {total} 条记录</div>
        </div>
        {tab === 'codes' && (
          <button className="btn-primary flex items-center gap-2" onClick={() => setGenOpen(true)}>
            <IconPlus size={16} /> 批量生成兑换码
          </button>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="mb-5 flex w-full max-w-sm rounded-xl bg-background p-1">
        <button
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === 'codes' ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}
          onClick={() => setTab('codes')}
        >
          兑换码
        </button>
        <button
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === 'orders' ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}
          onClick={() => setTab('orders')}
        >
          支付订单
        </button>
      </div>

      {tab === 'codes' && (
        <>
          {/* 统计 */}
          <div className="mb-5 grid grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-xs text-text-muted">可用</div>
              <div className="mt-1 text-2xl font-bold text-[#4caf50]">{stats.available}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-text-muted">已使用</div>
              <div className="mt-1 text-2xl font-bold text-primary">{stats.used}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-text-muted">已作废</div>
              <div className="mt-1 text-2xl font-bold text-danger">{stats.revoked}</div>
            </div>
          </div>

          {/* 状态筛选 */}
          <div className="mb-4 flex items-center gap-2">
            {['all', 'unused', 'used', 'revoked'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  statusFilter === s ? 'bg-primary text-white' : 'bg-background text-text-secondary hover:bg-primary/10'
                }`}
              >
                {{ all: '全部', unused: '未使用', used: '已使用', revoked: '已作废' }[s]}
              </button>
            ))}
          </div>

          {/* 列表 */}
          {loading ? (
            <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
          ) : codes.length === 0 ? (
            <div className="card py-16 text-center text-text-muted">暂无兑换码</div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/60 text-xs text-text-muted">
                    <th className="px-4 py-3">兑换码</th>
                    <th className="px-4 py-3">金额</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">使用时间</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(c => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-background/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <IconLock size={14} className="text-text-muted" />
                          <span className="font-mono font-semibold text-text-primary">{c.code}</span>
                          <button
                            className="text-text-muted transition hover:text-primary"
                            onClick={() => navigator.clipboard.writeText(c.code).then(() => alert('已复制'))}
                            title="复制"
                          >
                            <IconCopy size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">¥{Number(c.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_MAP[c.status].cls}`}>
                          {STATUS_MAP[c.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {c.usedAt ? new Date(c.usedAt).toLocaleString('zh-CN', { hour12: false }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'unused' && (
                          <button className="text-xs font-medium text-danger hover:underline" onClick={() => revoke(c.id)}>
                            作废
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        <>
          {loading ? (
            <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="card py-16 text-center text-text-muted">暂无支付订单</div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/60 text-xs text-text-muted">
                    <th className="px-4 py-3">订单号</th>
                    <th className="px-4 py-3">金额</th>
                    <th className="px-4 py-3">渠道</th>
                    <th className="px-4 py-3">关联答卷</th>
                    <th className="px-4 py-3">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-background/40">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-text-primary">{o.orderNo}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">¥{Number(o.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${o.channel === 'wechat' ? 'bg-[#eef7ef] text-[#4caf50]' : 'bg-primary-light text-primary'}`}>
                          {CHANNEL_MAP[o.channel] || o.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {o.response ? (
                          <span>
                            答卷 #{o.response.id} · {o.response.resultType}
                            {o.response.mode && <span className="ml-1 rounded bg-background px-1.5 py-0.5">{o.response.mode}</span>}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {new Date(o.createdAt).toLocaleString('zh-CN', { hour12: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
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

      {/* 生成弹窗 */}
      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => !genLoading && setGenOpen(false)}>
          <div className="w-full max-w-md animate-[fadeIn_.25s_ease] rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">批量生成兑换码</h3>
              <button className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-background" onClick={() => !genLoading && setGenOpen(false)}>
                ✕
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">生成数量</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={genCount}
                  onChange={e => setGenCount(Number(e.target.value) || 10)}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">单价（元）</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={genAmount}
                  onChange={e => setGenAmount(Number(e.target.value) || 9.9)}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            {genResult.length > 0 ? (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">已生成 {genResult.length} 个</span>
                  <button className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={copyAll}>
                    <IconCopy size={13} /> 复制全部
                  </button>
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl bg-background p-3">
                  {genResult.map(c => (
                    <div key={c} className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 font-mono text-sm text-text-primary">
                      {c}
                      <button className="text-text-muted hover:text-primary" onClick={() => navigator.clipboard.writeText(c).then(() => alert('已复制'))}>
                        <IconCopy size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn-primary mt-4 w-full" onClick={() => { setGenOpen(false); setGenResult([]); }}>
                  完成
                </button>
              </div>
            ) : (
              <button className="btn-primary mt-5 w-full py-2.5" onClick={generate} disabled={genLoading}>
                {genLoading ? '生成中...' : '生成兑换码'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
