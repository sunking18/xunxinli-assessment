import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { getAssessmentIcon, IconBarChart, IconClipboard, IconEdit, IconUsers } from '../../components/Icons';

interface AssessmentItem {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string;
  coverColor: string;
  icon?: string | null;
  status: string;
  sortOrder: number;
  questionCount: number;
  fillCount: number;
}

interface Stats {
  assessmentCount: number;
  publishedCount: number;
  responseCount: number;
  categories: { category: string; count: number }[];
  assessments: AssessmentItem[];
  recentResponses: {
    id: number;
    resultType: string;
    createdAt: string;
    assessment: { code: string; name: string; coverColor: string };
  }[];
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  published: { label: '已发布', cls: 'bg-success/10 text-success' },
  draft: { label: '草稿', cls: 'bg-warning/10 text-warning' },
  closed: { label: '已关闭', cls: 'bg-danger/10 text-danger' },
  deleted: { label: '已删除', cls: 'bg-error/10 text-error' },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/admin/stats').then(res => setStats(res.data.data)).catch(() => {});
  }, []);

  const sortedAssessments = useMemo(() => {
    if (!stats) return [];
    const order: Record<string, number> = { published: 0, draft: 1, closed: 2, deleted: 3 };
    return [...stats.assessments].sort((a, b) => {
      const ao = order[a.status] ?? 9;
      const bo = order[b.status] ?? 9;
      if (ao !== bo) return ao - bo;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [stats?.assessments]);

  const cards = [
    { label: '测评总数', value: stats?.assessmentCount ?? '-', icon: IconClipboard, color: 'bg-primary' },
    { label: '已发布测评', value: stats?.publishedCount ?? '-', icon: IconBarChart, color: 'bg-success' },
    { label: '答卷总数', value: stats?.responseCount ?? '-', icon: IconUsers, color: 'bg-warning' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-text-primary">数据概览</h1>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(c => (
          <div key={c.label} className="card flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${c.color}`}>
              <c.icon size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{c.value}</div>
              <div className="text-sm text-text-secondary">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {/* 全部测评 */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-text-primary">
              <span className="h-4 w-1 rounded-full bg-primary" />
              全部测评
            </h2>
            <span className="text-sm text-text-muted">共 {stats?.assessments.length ?? 0} 个</span>
          </div>

          {!stats || sortedAssessments.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">暂无测评</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedAssessments.map(a => (
                <div
                  key={a.id}
                  className="group flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ background: a.coverColor }}
                    >
                      {getAssessmentIcon(a.code, 'h-6 w-6')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold text-text-primary">{a.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">
                        {a.description}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-primary-light px-2.5 py-1 font-medium text-primary">
                      {a.category}
                    </span>
                    <span className="rounded-full bg-background px-2.5 py-1 text-text-secondary">
                      {a.questionCount} 题
                    </span>
                    <span className="rounded-full bg-background px-2.5 py-1 text-text-secondary">
                      {a.fillCount} 人已测
                    </span>
                    <span className="rounded-full bg-background px-2.5 py-1 text-text-secondary">
                      排序 {a.sortOrder ?? '-'}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 font-medium ${STATUS_MAP[a.status]?.cls ?? 'bg-background text-text-secondary'}`}>
                      {STATUS_MAP[a.status]?.label ?? a.status}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center gap-3">
                    <Link
                      to={`/admin/assessments/${a.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
                    >
                      <IconEdit size={16} />
                      编辑测评
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最新答卷 */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-text-primary">
              <span className="h-4 w-1 rounded-full bg-primary" />
              最新答卷
            </h2>
            <Link to="/admin/assessments" className="text-sm text-primary hover:underline">查看测评 →</Link>
          </div>
          {!stats || stats.recentResponses.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">
              暂无答卷数据
              <div className="mt-2">
                <Link to="/" className="text-primary hover:underline">去首页体验测评 →</Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentResponses.map(r => (
                <li key={r.id}>
                  <Link to={`/admin/responses/${r.id}`} className="flex items-center gap-3 py-3 transition hover:bg-background">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ background: r.assessment.coverColor }}
                    >
                      {getAssessmentIcon(r.assessment.code, 'h-4 w-4')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">{r.assessment.name}</div>
                      <div className="text-xs text-text-muted">{new Date(r.createdAt).toLocaleString('zh-CN')}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
                      {r.resultType}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
