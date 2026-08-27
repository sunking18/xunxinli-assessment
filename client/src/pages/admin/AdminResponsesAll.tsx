import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';
import { getAssessmentIcon, IconClipboardList, IconFileText, IconLayers } from '../../components/Icons';

interface AssessmentItem {
  id: number;
  code: string;
  name: string;
  nameEn: string | null;
  category: string;
  description: string;
  coverColor: string;
  icon: string | null;
  status: string;
  responseCount: number;
  questionCount: number;
}

export default function AdminResponsesAll() {
  const [list, setList] = useState<AssessmentItem[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/assessments')
      .then(res => {
        setList(res.data.data || []);
        setTotalResponses((res.data.data || []).reduce((s: number, a: AssessmentItem) => s + (a.responseCount || 0), 0));
      })
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">答卷管理</h1>
        <div className="text-sm text-text-muted">按测评分组 · 共 {list.length} 个测评 · {totalResponses} 份答卷</div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
      ) : list.length === 0 ? (
        <div className="card py-16 text-center text-text-muted">
          暂无测评
          <div className="mt-2">
            <Link to="/admin/assessments" className="text-primary hover:underline">前往创建测评 →</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(a => (
            <Link
              key={a.id}
              to={`/admin/assessments/${a.id}/responses`}
              className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: a.coverColor }}
                >
                  {getAssessmentIcon(a.code, 'h-6 w-6')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-text-primary">{a.name}</div>
                  {a.nameEn && <div className="truncate text-xs text-text-muted">{a.nameEn}</div>}
                </div>
                {a.status !== 'published' && (
                  <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-xs text-text-muted">{a.status === 'draft' ? '草稿' : a.status}</span>
                )}
              </div>

              {a.description && (
                <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-text-secondary">{a.description}</p>
              )}

              <div className="mt-4 flex items-center gap-4 border-t border-border pt-3.5 text-sm">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <IconClipboardList size={15} className="text-primary" />
                  <span className="text-base font-bold text-text-primary">{a.responseCount}</span>
                  <span className="text-xs text-text-muted">份答卷</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <IconFileText size={15} className="text-primary" />
                  <span className="text-base font-bold text-text-primary">{a.questionCount}</span>
                  <span className="text-xs text-text-muted">题</span>
                </div>
                <span className="ml-auto flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  查看答卷 <IconLayers size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
