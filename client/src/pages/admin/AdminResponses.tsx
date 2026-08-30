import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';
import { IconChevronLeft, IconDownload, IconEye, IconTrash } from '../../components/Icons';

interface ResponseItem {
  id: number;
  resultType: string;
  totalScore: number;
  respondentName: string | null;
  duration: number | null;
  status: string;
  createdAt: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'active': return { text: '正常', className: 'bg-green-100 text-green-700' };
    default: return { text: status, className: 'bg-gray-100 text-gray-700' };
  }
};

export default function AdminResponses() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessmentName, setAssessmentName] = useState('');
  const [list, setList] = useState<ResponseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/assessments/${id}/responses`, { params: { page, pageSize } })
      .then(res => {
        setList(res.data.data.list || []);
        setTotal(res.data.data.total || 0);
      })
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, page, pageSize]);

  useEffect(() => {
    api.get(`/admin/assessments/${id}`)
      .then(res => setAssessmentName(res.data.data.name))
      .catch(() => {});
    load();
  }, [id, load]);

  const handleDelete = async (rid: number) => {
    if (!confirm('确定删除这份答卷吗？删除后不可恢复。')) return;
    try {
      await api.delete(`/admin/responses/${rid}`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/admin/assessments/${id}/responses/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `responses-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text-primary">
            <IconChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{assessmentName || '答卷管理'}</h1>
            <div className="text-sm text-text-muted">共 {total} 份答卷</div>
          </div>
        </div>
        <button className="btn-secondary px-4 py-2 text-sm" onClick={handleExport}>
          <IconDownload size={15} />
          导出 CSV
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-text-muted">暂无答卷</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-xs text-text-muted">
                  <th className="px-5 py-3 font-medium">编号</th>
                  <th className="px-4 py-3 font-medium">提交时间</th>
                  <th className="px-4 py-3 font-medium">称呼</th>
                  <th className="px-4 py-3 font-medium">结果类型</th>
                  <th className="px-4 py-3 font-medium">总分</th>
                  <th className="px-4 py-3 font-medium">耗时</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((r, i) => (
                  <tr key={r.id} className="transition hover:bg-background">
                    <td className="px-5 py-3 text-text-muted">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-4 py-3 text-text-secondary">{new Date(r.createdAt).toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.respondentName || '匿名'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">{r.resultType}</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{r.totalScore ?? '-'}</td>
                    <td className="px-4 py-3 text-text-muted">{r.duration ? `${r.duration}s` : '-'}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const badge = statusBadge(r.status);
                        return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.text}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/admin/responses/${r.id}`} title="查看详情与报告"
                          className="rounded-lg p-2 text-text-muted hover:bg-primary-light hover:text-primary">
                          <IconEye size={16} />
                        </Link>
                        <button title="删除" onClick={() => handleDelete(r.id)}
                          className="rounded-lg p-2 text-text-muted hover:bg-danger/10 hover:text-danger">
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button className="btn-secondary px-3 py-1.5 text-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span className="px-3 text-sm text-text-secondary">{page} / {totalPages}</span>
          <button className="btn-secondary px-3 py-1.5 text-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
      )}
    </div>
  );
}
