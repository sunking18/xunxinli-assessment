import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { getAssessmentIcon, IconHistory, IconTrash, IconSparkles } from '../components/Icons';

interface MyReport {
  responseId: number;
  assessmentId: number;
  assessmentName: string;
  assessmentCode: string;
  coverColor: string;
  resultType: string;
  resultTitle: string;
  summary: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
}

export default function UserReports() {
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/my/reports')
      .then(res => {
        const reports: MyReport[] = res.data.data?.reports || [];
        setReports(reports);
      })
      .catch(err => setError(getErrorMessage(err, '加载失败')))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (responseId: number) => {
    if (!confirm('确定删除这条报告记录？删除后可在后台恢复。')) return;
    try {
      await api.patch(`/my/responses/${responseId}`, { status: 'user_deleted' });
      setReports(prev => prev.filter(r => r.responseId !== responseId));
    } catch (err) {
      setError(getErrorMessage(err, '删除失败'));
    }
  };

  const clearAll = () => {
    if (!confirm('当前登录账号的所有报告将全部删除，此操作可在后台恢复。')) return;
    setError('');
    const ids = reports.map(r => r.responseId);
    Promise.allSettled(ids.map(id => api.patch(`/my/responses/${id}`, { status: 'user_deleted' })))
      .then(() => setReports([]));
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <IconHistory size={22} className="text-primary" />
            我的报告
          </h1>
          <p className="mt-1 text-sm text-text-muted">查看你填写过的测评与生成报告</p>
        </div>
        {reports.length > 0 && (
          <button
            onClick={clearAll}
            className="rounded-lg px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
          >
            清空记录
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : error ? (
        <div className="card py-12 text-center text-danger">{error}</div>
      ) : reports.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background text-text-muted">
            <IconHistory size={28} />
          </div>
          <h3 className="text-base font-semibold text-text-primary">还没有报告</h3>
          <p className="mt-2 text-sm text-text-muted">完成测评后，报告会出现在这里</p>
          <Link to="/" className="btn-primary mt-5 inline-flex px-6 py-2.5 text-sm">
            <IconSparkles size={16} />
            去测评
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => (
            <div
              key={r.responseId}
              className="card card-hover flex flex-col gap-4 p-5 transition-all sm:flex-row sm:items-center"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-soft"
                style={{ background: r.coverColor }}
              >
                {getAssessmentIcon(r.assessmentCode, 'h-6 w-6')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-text-primary">{r.assessmentName}</h3>
                  <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                    {r.resultType}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-text-muted">{r.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                  <span>得分 {r.totalScore} / {r.maxScore}</span>
                  <span>·</span>
                  <span>{new Date(r.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                <Link
                  to={`/report/${r.responseId}`}
                  className="btn-primary px-4 py-2 text-sm text-center"
                >
                  查看报告
                </Link>
                <button
                  onClick={() => remove(r.responseId)}
                  className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition hover:bg-danger/10 hover:text-danger"
                >
                  <IconTrash size={14} />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
