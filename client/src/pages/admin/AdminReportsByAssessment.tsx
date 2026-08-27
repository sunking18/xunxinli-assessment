import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';
import { getAssessmentIcon, IconChevronLeft, IconEye, IconSearch } from '../../components/Icons';

interface ReportItem {
  id: number;
  resultType: string;
  totalScore: number | null;
  respondentName: string | null;
  duration: number | null;
  createdAt: string;
  // 分享与配对扩展（love / lovetri）
  mode?: string;
  pairCode?: string;
  shareCode?: string;
  partnerName?: string;
  matchedAt?: string;
}

interface AssessmentInfo {
  id: number;
  code: string;
  name: string;
  coverColor: string;
  icon: string | null;
}

export default function AdminReportsByAssessment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<AssessmentInfo | null>(null);
  const [list, setList] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/admin/assessments/${id}`),
      api.get(`/admin/assessments/${id}/responses`, {
        params: { page, pageSize, startDate: startDate || undefined, endDate: endDate || undefined },
      }),
    ])
      .then(([infoRes, listRes]) => {
        setInfo(infoRes.data.data);
        setList(listRes.data.data.list || []);
        setTotal(listRes.data.data.total || 0);
      })
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, page, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const fmtDuration = (s?: number | null) => {
    if (!s) return '0秒';
    if (s < 60) return `${s}秒`;
    return `${Math.floor(s / 60)}分${s % 60}秒`;
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text-primary">
            <IconChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            {info && (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: info.coverColor }}>
                {getAssessmentIcon(info.code, 'h-5 w-5')}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-text-primary">{info?.name || '报告列表'}</h1>
              <div className="text-xs text-text-muted">共 {total} 份报告</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(1); }}
            className="rounded-lg border border-border px-2.5 py-1.5 outline-none focus:border-primary"
          />
          <span className="text-text-muted">至</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(1); }}
            className="rounded-lg border border-border px-2.5 py-1.5 outline-none focus:border-primary"
          />
          <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }} className="btn-secondary text-xs">
            重置
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
      ) : list.length === 0 ? (
        <div className="card py-16 text-center text-text-muted">该时间段暂无报告</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map(r => (
            <div key={r.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-text-muted">{new Date(r.createdAt).toLocaleString('zh-CN', { hour12: false })}</div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {info?.code === 'lovetri' && r.pairCode && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.partnerName || r.matchedAt ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>
                      {r.partnerName || r.matchedAt ? '已配对' : '邀请中'}
                    </span>
                  )}
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{r.resultType}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-lg">{r.respondentName?.[0] || '?'}</div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-text-primary">{r.respondentName || '匿名用户'}</div>
                  <div className="text-xs text-text-muted">{fmtDuration(r.duration)} · 总分 {r.totalScore ?? '-'}</div>
                </div>
              </div>
              <Link
                to={`/admin/responses/${r.id}`}
                className="mt-4 inline-flex items-center justify-center gap-1 rounded-lg border border-primary py-1.5 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
              >
                <IconEye size={15} /> 查看报告
              </Link>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-secondary disabled:opacity-40 hover:bg-background"
          >
            上一页
          </button>
          <span className="text-sm text-text-muted">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-secondary disabled:opacity-40 hover:bg-background"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
