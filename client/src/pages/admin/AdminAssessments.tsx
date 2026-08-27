import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, getErrorMessage } from '../../api/client';
import { getBaseUrl } from '../../utils/getBaseUrl';
import {
  getAssessmentIcon, IconBarChart, IconEdit, IconExternal, IconEye, IconPlus, IconQrCode, IconRefresh, IconTrash,
} from '../../components/Icons';

interface AssessmentItem {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string;
  coverColor: string;
  icon: string;
  status: string;
  sortOrder: number;
  fillCount: number;
  questionCount: number;
  responseCount: number;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  published: { label: '已发布', cls: 'bg-success/10 text-success' },
  draft: { label: '草稿', cls: 'bg-background text-text-muted' },
  closed: { label: '已关闭', cls: 'bg-danger/10 text-danger' },
  deleted: { label: '已删除', cls: 'bg-error/10 text-error' },
};

export default function AdminAssessments() {
  const [list, setList] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrFor, setQrFor] = useState<AssessmentItem | null>(null);
  const baseUrl = useMemo(() => getBaseUrl(), []);

  const load = () => {
    setLoading(true);
    api.get('/admin/assessments')
      .then(res => {
        const data: AssessmentItem[] = res.data.data || [];
        setList(data);
      })
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (a: AssessmentItem) => {
    if (!confirm(`确定将测评「${a.name}」标记为删除状态吗？删除后用户端不再展示，但数据仍保留，可随时恢复。`)) return;
    try {
      await api.delete(`/admin/assessments/${a.id}`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleRestore = async (a: AssessmentItem) => {
    if (!confirm(`确定恢复测评「${a.name}」吗？恢复后将重新对用户可见。`)) return;
    try {
      await api.post(`/admin/assessments/${a.id}/restore`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">测评管理</h1>
        <Link to="/admin/assessments/new" className="btn-primary px-4 py-2 text-sm">
          <IconPlus size={16} />
          新建测评
        </Link>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-text-muted">暂无测评，点击右上角「新建测评」创建</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-xs text-text-muted">
                  <th className="px-5 py-3 font-medium">测评</th>
                  <th className="px-4 py-3 font-medium">访问码</th>
                  <th className="px-4 py-3 font-medium">分类</th>
                  <th className="px-4 py-3 font-medium">题目</th>
                  <th className="px-4 py-3 font-medium">排序</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">答卷数</th>
                  <th className="px-4 py-3 font-medium">访问数</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map(a => (
                  <tr key={a.id} className={`transition hover:bg-background ${a.status === 'deleted' ? 'bg-error/5 opacity-70' : ''}`}>
                    <td className="px-5 py-3.5">
                      <Link to={`/admin/assessments/${a.id}/analytics`} className="flex items-center gap-3 group">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                          style={{ background: a.coverColor }}
                        >
                          {getAssessmentIcon(a.code, 'h-5 w-5')}
                        </div>
                        <div>
                          <div className="font-medium text-text-primary group-hover:text-primary group-hover:underline">{a.name}</div>
                          <div className="max-w-56 truncate text-xs text-text-muted">{a.description}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="rounded bg-background px-2 py-0.5 font-mono text-xs text-text-secondary">{a.code}</code>
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">{a.category}</td>
                    <td className="px-4 py-3.5 text-text-secondary">{a.questionCount}</td>
                    <td className="px-4 py-3.5 text-text-secondary">{a.sortOrder ?? '-'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_MAP[a.status]?.cls || ''}`}>
                        {STATUS_MAP[a.status]?.label || a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-text-primary">{a.responseCount}</td>
                    <td className="px-4 py-3.5 text-text-secondary">{a.fillCount}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/assessments/${a.id}/analytics`}
                          title="数据分析"
                          className="rounded-lg p-2 text-text-muted transition hover:bg-primary-light hover:text-primary"
                        >
                          <IconBarChart size={16} />
                        </Link>
                        <button
                          title="答卷列表"
                          onClick={() => window.location.href = `/admin/assessments/${a.id}/responses`}
                          className="rounded-lg p-2 text-text-muted transition hover:bg-primary-light hover:text-primary"
                        >
                          <IconEye size={16} />
                        </button>
                        <button
                          title="二维码"
                          onClick={() => setQrFor(a)}
                          className="rounded-lg p-2 text-text-muted transition hover:bg-primary-light hover:text-primary"
                        >
                          <IconQrCode size={16} />
                        </button>
                        <Link
                          to={`/fill/${a.code}`}
                          title="预览"
                          target="_blank"
                          className="rounded-lg p-2 text-text-muted transition hover:bg-primary-light hover:text-primary"
                        >
                          <IconExternal size={16} />
                        </Link>
                        <Link
                          to={`/admin/assessments/${a.id}`}
                          title="编辑"
                          className="rounded-lg p-2 text-text-muted transition hover:bg-primary-light hover:text-primary"
                        >
                          <IconEdit size={16} />
                        </Link>
                        {a.status === 'deleted' ? (
                          <button
                            title="恢复"
                            onClick={() => handleRestore(a)}
                            className="rounded-lg p-2 text-text-muted transition hover:bg-success/10 hover:text-success"
                          >
                            <IconRefresh size={16} />
                          </button>
                        ) : (
                          <button
                            title="删除"
                            onClick={() => handleDelete(a)}
                            className="rounded-lg p-2 text-text-muted transition hover:bg-danger/10 hover:text-danger"
                          >
                            <IconTrash size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 二维码弹窗 */}
      {qrFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQrFor(null)}>
          <div className="card w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">扫码开始测评</h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setQrFor(null)}>✕</button>
            </div>
            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCodeSVG
                value={`${baseUrl}/fill/${qrFor.code}`}
                size={220}
                level="H"
                bgColor="#ffffff"
                fgColor="#3D405B"
              />
            </div>
            <div className="mt-4 text-center">
              <div className="font-medium text-text-primary">{qrFor.name}</div>
              <div className="mt-1 text-xs text-text-muted">微信扫码或手机浏览器访问</div>
            </div>
            <div className="mt-3 rounded-lg bg-background px-3 py-2 text-center font-mono text-xs text-text-secondary break-all">
              {baseUrl}/fill/{qrFor.code}
            </div>
            <Link
              to={`/fill/${qrFor.code}`}
              target="_blank"
              className="btn-primary mt-4 w-full py-2.5 text-sm"
            >
              打开测评页面
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
