import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';
import { getAssessmentIcon, IconFileText, IconLayers, IconSearch } from '../../components/Icons';

interface ReportGroup {
  id: number;
  code: string;
  name: string;
  nameEn: string | null;
  category: string;
  description: string;
  coverColor: string;
  icon: string | null;
  responseCount: number;
  latestResponseAt: string | null;
  latestRespondentName: string | null;
}

export default function AdminReports() {
  const [list, setList] = useState<ReportGroup[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/reports/grouped')
      .then(res => setList(res.data.data || []))
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = list.filter(a =>
    !keyword ||
    a.name.toLowerCase().includes(keyword.toLowerCase()) ||
    (a.nameEn || '').toLowerCase().includes(keyword.toLowerCase()) ||
    a.category.toLowerCase().includes(keyword.toLowerCase())
  );

  const totalReports = list.reduce((s, a) => s + (a.responseCount || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">报告中心</h1>
        <div className="text-sm text-text-muted">按测评分组 · 已生成的个性化报告 · 共 {totalReports} 份</div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索问卷名称..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <span className="text-sm text-text-muted">共 {filtered.length} 个测评</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-text-muted">暂无报告</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(a => (
            <Link
              key={a.id}
              to={`/admin/reports/assessments/${a.id}`}
              className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: a.coverColor }}>
                  {getAssessmentIcon(a.code, 'h-6 w-6')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-text-primary">{a.name}</div>
                  {a.nameEn && <div className="truncate text-xs text-text-muted">{a.nameEn}</div>}
                  <div className="mt-0.5 text-xs text-text-muted">{a.category}</div>
                </div>
              </div>

              {a.description && (
                <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-text-secondary">{a.description}</p>
              )}

              <div className="mt-4 flex items-center gap-4 border-t border-border pt-3.5 text-sm">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <IconFileText size={15} className="text-primary" />
                  <span className="text-base font-bold text-text-primary">{a.responseCount}</span>
                  <span className="text-xs text-text-muted">份报告</span>
                </div>
                {a.latestResponseAt && (
                  <div className="truncate text-xs text-text-muted">
                    最近 {new Date(a.latestResponseAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                )}
                <span className="ml-auto flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  查看报告 <IconLayers size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
