import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api, getErrorMessage } from '../../api/client';
import {
  IconBarChart, IconChevronLeft, IconDownload, IconRefresh, IconSparkles,
} from '../../components/Icons';

const SEV_COLORS = ['#7fb88a', '#e0a458', '#c4705a', '#a8664d', '#8c6d5a'];
const tooltipStyle = {
  backgroundColor: '#fff8f0',
  borderColor: '#f0dcd2',
  borderWidth: 1,
  borderStyle: 'solid',
  borderRadius: 8,
  color: '#5a4a42',
};

interface DemographyItem { name: string; count: number; }

interface LatestResponse {
  responseId: number;
  userId: number | null;
  username: string | null;
  nickname: string | null;
  displayName: string | null;
  respondentName: string | null;
  ipAddress: string | null;
  duration: number | null;
  startTime: string | null;
  createdAt: string;
  resultType: string;
  totalScore: number | null;
  answers: Record<string, any>;
  respondentInfo: {
    gender: string | null;
    age: string | null;
    occupation: string | null;
    income: string | null;
    city: string | null;
    region: string | null;
    nameInitials: string | null;
    phoneLast4: string | null;
  };
}

interface AnalyticsData {
  assessment: { id: number; code: string; name: string; questionCount: number; fillCount: number };
  summary: { totalResponses: number; uniqueUsers: number; todayCount: number; avgDuration: number; latestCount: number };
  resultTypeDist: { resultType: string; count: number }[];
  dimensionStats: { code: string; name: string; maxScore: number; avgScore: number; avgConcern: number; severity: { label: string; count: number }[] }[];
  questionStats: { id: string; title: string; dimension: string; total: number; avgScore: number; counts: { value: number; count: number }[] }[];
  demography: { gender: DemographyItem[]; age: DemographyItem[]; occupation: DemographyItem[]; city: DemographyItem[]; income: DemographyItem[] };
  dailyTrend: { date: string; count: number }[];
  latestResponses: LatestResponse[];
  allResponses: LatestResponse[];
}

export default function AdminAssessmentAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [answerDisplay, setAnswerDisplay] = useState<'score' | 'option'>('option');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/assessments/${id}/analytics`)
      .then(res => setData(res.data.data))
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const questions = useMemo(() => data?.assessment ? (data.assessment as any).questions || [] : [], [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const k = keyword.trim().toLowerCase();
    if (!k) return data.allResponses;
    return data.allResponses.filter(r => {
      const info = r.respondentInfo;
      return [
        String(r.responseId),
        r.username, r.nickname, r.displayName, r.respondentName,
        r.ipAddress, r.resultType,
        info?.gender, info?.age, info?.occupation, info?.income, info?.city, info?.region, info?.nameInitials,
      ].some(v => String(v ?? '').toLowerCase().includes(k));
    });
  }, [data, keyword]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRows.length / pageSize)), [filteredRows, pageSize]);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  useEffect(() => { setCurrentPage(1); }, [keyword, pageSize]);

  const handleExport = async (mode: 'option' | 'score', format: 'csv' | 'json' = 'csv') => {
    try {
      const res = await api.get(`/admin/assessments/${id}/responses/export?mode=${mode}&format=${format}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: format === 'json' ? 'application/json' : 'text/csv; charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `responses-${data?.assessment.code || 'export'}-${mode}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  if (loading || !data) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>;

  const summary = data.summary;
  const fmtDuration = (s?: number | null) => {
    if (!s) return '0秒';
    if (s < 60) return `${s}秒`;
    return `${Math.floor(s / 60)}分${s % 60}秒`;
  };
  const fmtDate = (d: string) => new Date(d).toLocaleString('zh-CN', { hour12: false });
  const fmtShortDate = (d: string) => new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

  const topCards = [
    { label: '总答题数', value: summary.totalResponses, sub: '累计提交' },
    { label: '去重人数', value: summary.uniqueUsers, sub: '按登录用户去重' },
    { label: '今日新增', value: summary.todayCount, sub: new Date().toLocaleDateString('zh-CN') },
    { label: '平均答题时长', value: fmtDuration(summary.avgDuration), sub: '秒 / 人' },
  ];

  // 渲染每题答案：按分数展示 value，按选项展示 label
  const renderAnswer = (answer: any, q: any) => {
    if (answer === undefined || answer === null || answer === '') return '-';
    if (answerDisplay === 'score') return String(answer);
    // 按选项展示：匹配题目 options 中的 label
    const opts = Array.isArray(q.options) ? q.options : [];
    const matched = opts.find((o: any) => String(o.value) === String(answer));
    return matched && matched.label ? matched.label : String(answer);
  };

  return (
    <div className="space-y-5">
      {/* 顶部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text-primary">
            <IconChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <IconBarChart size={22} className="text-primary" />
              {data.assessment.name}
            </h1>
            <div className="text-sm text-text-muted">数据概览 · 共 {summary.totalResponses} 份答卷（去重 {summary.uniqueUsers} 人）· {data.assessment.questionCount} 题</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={load} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            <IconRefresh size={16} /> 刷新数据
          </button>
          <button onClick={() => handleExport('option')} className="btn-primary inline-flex items-center gap-1.5 text-sm">
            <IconDownload size={16} /> CSV(按选项)
          </button>
          <button onClick={() => handleExport('score')} className="btn-primary inline-flex items-center gap-1.5 text-sm">
            <IconDownload size={16} /> CSV(按分值)
          </button>
          <button onClick={() => handleExport('option', 'json')} className="btn-primary inline-flex items-center gap-1.5 text-sm">
            <IconDownload size={16} /> JSON
          </button>
        </div>
      </div>

      {/* 概览卡 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topCards.map((c, i) => (
          <div key={i} className="card flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-text-muted">{c.label}</div>
              <div className="mt-1 text-3xl font-bold text-text-primary">{c.value}</div>
              <div className="mt-0.5 text-xs text-text-muted">{c.sub}</div>
            </div>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <IconSparkles size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* 数据明细 */}
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-text-primary">数据明细</h2>
            <div className="mt-1 flex items-center gap-1 text-xs text-primary">
              <span>← 左右滑动表格查看每题答案 →</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setAnswerDisplay('option')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${answerDisplay === 'option' ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-background'}`}
              >
                按选项
              </button>
              <button
                onClick={() => setAnswerDisplay('score')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${answerDisplay === 'score' ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-background'}`}
              >
                按分数
              </button>
            </div>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜索性别/年龄/城市/姓名缩写/ID..."
              className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary sm:w-72"
            />
            <span className="shrink-0 text-xs text-text-muted">共 {filteredRows.length} 条记录</span>
          </div>
        </div>
        <div className="max-h-[600px] overflow-auto">
          <table className="w-max text-left text-sm">
            <thead className="bg-background text-text-muted">
              <tr>
                <th className="sticky left-0 top-0 z-30 bg-background px-3 py-2.5 font-medium whitespace-nowrap w-12 text-center">序号</th>
                <th className="sticky left-12 top-0 z-20 bg-background px-3 py-2.5 font-medium whitespace-nowrap">ID</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">提交时间</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">答题时长</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">用户ID</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">用户名</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">答题人</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">IP</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">性别</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">年龄</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">职业</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">收入</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">城市</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">地区</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">姓名缩写</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">手机号后四位</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">总分</th>
                <th className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">结果</th>
                {questions.map((q: any, i: number) => (
                  <th key={q.id} className="sticky top-0 z-10 bg-background px-3 py-2.5 font-medium whitespace-nowrap">Q{i + 1} · {q.title || q.id}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedRows.map((r, idx) => (
                <tr key={r.responseId} className="hover:bg-background/60">
                  <td className="sticky left-0 z-20 bg-white px-3 py-2.5 whitespace-nowrap w-12 text-center text-text-secondary">{filteredRows.length - (currentPage - 1) * pageSize - idx}</td>
                  <td className="sticky left-12 z-20 bg-white px-3 py-2.5 whitespace-nowrap text-text-secondary">{r.responseId}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-text-secondary">{fmtShortDate(r.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{fmtDuration(r.duration)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.userId ?? '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.username || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.respondentName || r.nickname || r.displayName || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.ipAddress || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.respondentInfo?.gender || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.respondentInfo?.age || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.respondentInfo?.occupation || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.respondentInfo?.income || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.respondentInfo?.city || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.respondentInfo?.region || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.respondentInfo?.nameInitials || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.respondentInfo?.phoneLast4 || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-text-primary">{r.totalScore ?? '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{r.resultType}</td>
                  {questions.map((q: any) => (
                    <td key={q.id} className="whitespace-nowrap px-3 py-2.5 text-center text-text-secondary">{renderAnswer(r.answers[q.id], q)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRows.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-muted">暂无匹配数据</div>
        ) : (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-white px-4 py-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span>每页显示</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); }}
                className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-text-primary outline-none focus:border-primary"
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>条，共 {filteredRows.length} 条记录</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                上一页
              </button>
              <span className="min-w-[5rem] text-center text-sm text-text-muted">
                第 {currentPage} / {totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 图表区 */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 维度统计 */}
        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-text-primary">维度统计</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dimensionStats} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0dcd2" />
                <XAxis dataKey="name" tick={{ fill: '#8c7b73', fontSize: 12 }} />
                <YAxis tick={{ fill: '#8c7b73', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle as any} />
                <Bar dataKey="avgScore" name="平均得分" radius={[6, 6, 0, 0]}>
                  {data.dimensionStats.map((_, i) => (
                    <Cell key={i} fill={SEV_COLORS[i % SEV_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 每日趋势 */}
        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-text-primary">每日提交趋势（近30天）</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0dcd2" />
                <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fill: '#8c7b73', fontSize: 12 }} />
                <YAxis tick={{ fill: '#8c7b73', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle as any} />
                <Line type="monotone" dataKey="count" name="提交数" stroke="#c4705a" strokeWidth={2.5} dot={{ r: 3, fill: '#c4705a' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 结果类型 */}
        <div className="card p-4">
          <h2 className="mb-4 font-semibold text-text-primary">结果类型分布</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip contentStyle={tooltipStyle as any} />
                <Legend />
                <Pie data={data.resultTypeDist} dataKey="count" nameKey="resultType" outerRadius={80}>
                  {data.resultTypeDist.map((_, i) => (
                    <Cell key={i} fill={SEV_COLORS[i % SEV_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 性别分布 */}
        <div className="card p-4">
          <h2 className="mb-4 font-semibold text-text-primary">性别分布</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip contentStyle={tooltipStyle as any} />
                <Legend />
                <Pie data={data.demography.gender} dataKey="count" nameKey="name" outerRadius={80}>
                  {data.demography.gender.map((_, i) => (
                    <Cell key={i} fill={SEV_COLORS[i % SEV_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 年龄分布 */}
        <div className="card p-4">
          <h2 className="mb-4 font-semibold text-text-primary">年龄分布</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.demography.age} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0dcd2" />
                <XAxis type="number" tick={{ fill: '#8c7b73', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#8c7b73', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle as any} />
                <Bar dataKey="count" name="人数" radius={[0, 6, 6, 0]}>
                  {data.demography.age.map((_, i) => (
                    <Cell key={i} fill={SEV_COLORS[i % SEV_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 城市分布 TOP8 */}
        <div className="card p-4">
          <h2 className="mb-4 font-semibold text-text-primary">所在城市 TOP8</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.demography.city.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0dcd2" />
                <XAxis type="number" tick={{ fill: '#8c7b73', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#8c7b73', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle as any} />
                <Bar dataKey="count" name="人数" radius={[0, 6, 6, 0]}>
                  {data.demography.city.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={SEV_COLORS[i % SEV_COLORS.length]} />
                  ))}
                </Bar>
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 各题目平均得分（按维度分组） */}
      <div className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold text-text-primary">各题目平均得分（按维度分组）</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-background text-text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">维度</th>
                <th className="px-4 py-2.5 font-medium">题号</th>
                <th className="px-4 py-2.5 font-medium">题干</th>
                <th className="px-4 py-2.5 font-medium">平均分</th>
                <th className="px-4 py-2.5 font-medium">作答人数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.questionStats.map((q, idx) => {
                const prevDim = idx > 0 ? data.questionStats[idx - 1].dimension : '';
                const showDim = q.dimension && q.dimension !== prevDim;
                return (
                  <tr key={q.id} className="hover:bg-background/60">
                    <td className="px-4 py-2.5">
                      {showDim ? <span className="font-semibold text-primary">{q.dimension}</span> : ''}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{idx + 1}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{q.title || q.id}</td>
                    <td className="px-4 py-2.5 font-medium text-text-primary">{q.avgScore.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{q.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
