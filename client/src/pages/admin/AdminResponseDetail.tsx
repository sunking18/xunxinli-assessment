import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';
import { IconChevronLeft } from '../../components/Icons';
import LoveTriRadar from '../lovetri/LoveTriRadar';

interface ResponseDetail {
  id: number;
  answers: Record<string, any>;
  score: Record<string, number>;
  resultType: string;
  totalScore: number;
  report: any;
  respondentName: string | null;
  wechatInfo: { openid?: string; nickname?: string; avatar?: string } | null;
  duration: number | null;
  createdAt: string;
  ipAddress: string | null;
  assessment: { id: number; code: string; name: string; questions: any[] };
  // love / lovetri 分享与配对扩展
  mode?: string;
  pairCode?: string;
  isPaid?: boolean;
  paidAt?: string;
  shareCode?: string;
  sharedAt?: string;
  partnerResponseId?: number;
  partnerName?: string;
  matchedAt?: string;
}

export default function AdminResponseDetail() {
  const { responseId } = useParams<{ responseId: string }>();
  const [data, setData] = useState<ResponseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!responseId) return;
    api.get(`/admin/responses/${responseId}`)
      .then(res => setData(res.data.data))
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [responseId]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>;
  }
  if (!data) {
    return <div className="py-16 text-center text-text-muted">答卷不存在</div>;
  }

  const { report, assessment } = data;
  const dimAnalysis = report?.dimensionAnalysis || [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link to={`/admin/assessments/${assessment.id}/responses`} className="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text-primary">
          <IconChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">答卷详情</h1>
          <div className="text-sm text-text-muted">{assessment.name} · {new Date(data.createdAt).toLocaleString('zh-CN')}</div>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-text-primary">
          <span className="h-4 w-1 rounded-full bg-primary" />
          基本信息
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-text-muted">结果类型</div>
            <div className="mt-0.5 font-semibold text-primary">{data.resultType}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">总分</div>
            <div className="mt-0.5 font-semibold text-text-primary">{data.totalScore ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">称呼</div>
            <div className="mt-0.5 text-text-primary">{data.respondentName || '匿名'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">耗时</div>
            <div className="mt-0.5 text-text-primary">{data.duration ? `${data.duration} 秒` : '-'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">微信昵称</div>
            <div className="mt-0.5 truncate text-text-primary">{data.wechatInfo?.nickname || '未授权'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">微信 OpenID</div>
            <div className="mt-0.5 truncate font-mono text-xs text-text-secondary">{data.wechatInfo?.openid || '-'}</div>
          </div>
        </div>
      </div>

      {/* 分享与配对信息（love / lovetri） */}
      {(data.mode || data.pairCode || data.shareCode || data.partnerName || data.isPaid) && (
        <div className="card mt-5 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-text-primary">
            <span className="h-4 w-1 rounded-full bg-info" />
            分享与配对
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs text-text-muted">测评版本</div>
              <div className="mt-0.5 font-semibold text-text-primary">
                {data.mode === 'deep' ? '深度版' : data.mode === 'partner' ? '伴侣版' : data.mode ? '免费版' : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">是否付费</div>
              <div className="mt-0.5">
                {data.isPaid
                  ? <span className="rounded-full bg-success-light px-2 py-0.5 text-xs font-semibold text-success">已付费</span>
                  : <span className="rounded-full bg-background px-2 py-0.5 text-xs text-text-muted">未付费</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">配对邀请码</div>
              <div className="mt-0.5 truncate font-mono text-xs text-text-primary">{data.pairCode || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">分享码</div>
              <div className="mt-0.5 truncate font-mono text-xs text-text-primary">{data.shareCode || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">首次分享时间</div>
              <div className="mt-0.5 text-text-primary">{data.sharedAt ? new Date(data.sharedAt).toLocaleString('zh-CN') : '-'}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">配对状态</div>
              <div className="mt-0.5">
                {data.partnerName || data.matchedAt
                  ? <span className="rounded-full bg-success-light px-2 py-0.5 text-xs font-semibold text-success">已配对</span>
                  : data.pairCode
                    ? <span className="rounded-full bg-warning-light px-2 py-0.5 text-xs font-semibold text-warning">邀请中</span>
                    : <span className="rounded-full bg-background px-2 py-0.5 text-xs text-text-muted">未配对</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">伴侣称呼</div>
              <div className="mt-0.5 text-text-primary">{data.partnerName || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">伴侣答卷 ID</div>
              <div className="mt-0.5 truncate font-mono text-xs text-text-primary">{data.partnerResponseId ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">配对完成时间</div>
              <div className="mt-0.5 text-text-primary">{data.matchedAt ? new Date(data.matchedAt).toLocaleString('zh-CN') : '-'}</div>
            </div>
          </div>
        </div>
      )}

      {/* 维度得分 */}
      {dimAnalysis.length > 0 && (
        <div className="card mt-5 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-text-primary">
            <span className="h-4 w-1 rounded-full bg-primary" />
            维度得分
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {dimAnalysis.map((d: any) => (
              <div key={d.dimension} className="rounded-xl bg-background px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-primary">{d.label || d.dimension}</span>
                  <span className="text-text-secondary">{d.score} / {d.max}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${d.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 逐题答案 */}
      <div className="card mt-5 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-text-primary">
          <span className="h-4 w-1 rounded-full bg-primary" />
          逐题答案
        </h2>
        <div className="space-y-3">
          {assessment.questions.map((q: any, i: number) => {
            const answer = data.answers[q.id];
            let display = answer;
            if (q.type === 'radio' && q.options) {
              const opt = q.options.find((o: any) => String(o.value) === String(answer));
              display = opt ? opt.label : answer;
            }
            return (
              <div key={q.id} className="rounded-xl border border-border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-text-secondary">
                    <span className="mr-2 font-medium text-text-muted">Q{i + 1}</span>
                    {q.title}
                    {q.dimension && <span className="ml-2 rounded bg-background px-1.5 py-0.5 text-xs text-text-muted">{q.dimension}</span>}
                  </div>
                  <span className="shrink-0 rounded-lg bg-primary-light px-2.5 py-1 text-sm font-medium text-primary">{display ?? '未答'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 爱情三角报告（lovetri） */}
      {report?.loveTri && (
        <div className="card mt-5 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-text-primary">
            <span className="h-4 w-1 rounded-full bg-primary" />
            爱情三角报告
          </h2>
          <LoveTriReportBlock loveTri={report.loveTri} />
        </div>
      )}

      {/* 个性化报告 */}
      {report && (
        <div className="card mt-5 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-text-primary">
            <span className="h-4 w-1 rounded-full bg-primary" />
            个性化报告
          </h2>
          <div className="mb-4 rounded-xl bg-primary-light px-5 py-4 text-center">
            <div className="text-2xl font-bold text-primary">{report.resultTitle || data.resultType}</div>
            <div className="mt-1 text-sm text-primary">{report.summary}</div>
          </div>
          <div className="space-y-4">
            {report.overview && (
              <div>
                <div className="mb-1 text-sm font-semibold text-text-primary">结果解读</div>
                <p className="text-sm leading-relaxed text-text-secondary">{report.overview}</p>
              </div>
            )}
            {report.strengths?.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-semibold text-success">优势</div>
                <ul className="space-y-1 text-sm text-text-secondary">
                  {report.strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}
            {report.growthPoints?.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-semibold text-warning">成长建议</div>
                <ul className="space-y-1 text-sm text-text-secondary">
                  {report.growthPoints.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}
            {report.careers?.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-semibold text-text-primary">适配方向</div>
                <div className="flex flex-wrap gap-1.5">
                  {report.careers.map((c: string, i: number) => (
                    <span key={i} className="rounded-full border border-primary/20 bg-primary-light px-3 py-1 text-xs text-primary">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {report.advice && Object.keys(report.advice).length > 0 && (
              <div>
                <div className="mb-1 text-sm font-semibold text-info">沟通锦囊</div>
                <ul className="space-y-1.5 text-sm text-text-secondary">
                  {Object.entries(report.advice).map(([k, v]) => (
                    <li key={k} className="rounded-lg bg-info/10 px-3 py-2">✦ {String(v)}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-lg bg-background px-4 py-3 text-xs text-text-muted">{report.disclaimer}</div>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Link to={`/report/${data.id}`} target="_blank" className="btn-primary px-6">前台查看报告</Link>
        <Link to={`/admin/assessments/${assessment.id}/responses`} className="btn-secondary px-6">返回列表</Link>
      </div>
    </div>
  );
}

// —— 爱情三角报告内容 ——
const LT_AVATAR_IMG: Record<string, string> = {
  consummate: '/lovetri-avatars/consummate.png',
  romantic: '/lovetri-avatars/romantic.png',
  companionate: '/lovetri-avatars/companionate.png',
  fatuous: '/lovetri-avatars/fatuous.png',
  liking: '/lovetri-avatars/liking.png',
  infatuated: '/lovetri-avatars/infatuated.png',
  empty: '/lovetri-avatars/empty.png',
};
const LT_LABELS: Record<string, string> = { intimacy: '亲密', passion: '激情', commitment: '承诺' };

function LoveTriReportBlock({ loveTri }: { loveTri: any }) {
  const active = loveTri.types?.find((t: any) => t.active) || loveTri.types?.[0];
  const tri = (loveTri.triangle || []) as { dimension: string; label: string; avg: number; percent: number }[];
  return (
    <div>
      {/* 类型头部 */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-background px-5 py-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
          style={{ background: `linear-gradient(135deg, ${loveTri.color}22, ${loveTri.color}55)`, border: `2px solid ${loveTri.color}66` }}
        >
          <img
            src={LT_AVATAR_IMG[loveTri.type] || LT_AVATAR_IMG.consummate}
            alt={loveTri.avatarName || loveTri.cn}
            className="h-12 w-12 object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-bold text-text-primary">{loveTri.emoji} {loveTri.cn}</span>
            {loveTri.en && <span className="font-mono text-xs tracking-widest text-text-muted">{loveTri.en.toUpperCase()}</span>}
            {loveTri.tag && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: `${loveTri.color}22`, color: loveTri.color }}>
                {loveTri.tag}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-text-muted">主导人格 · {active?.cn || loveTri.avatarName || '-'}</div>
        </div>
      </div>

      {/* 雷达 + 维度 */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-sm font-semibold text-text-primary">三角雷达</div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <LoveTriRadar triangle={tri} theme="light" size={300} showPercent={false} />
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold text-text-primary">维度得分</div>
          <div className="space-y-3">
            {tri.map((d: any) => (
              <div key={d.dimension} className="rounded-xl bg-background px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-primary">{d.label || LT_LABELS[d.dimension] || d.dimension}</span>
                  <span className="text-text-secondary">avg {d.avg}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full" style={{ width: `${d.percent}%`, background: loveTri.color }} />
                </div>
              </div>
            ))}
          </div>
          {loveTri.balance && (
            <div className="mt-3 rounded-xl bg-primary-light px-4 py-3 text-sm">
              <div className="font-semibold text-primary">{loveTri.balance.title}</div>
              <div className="mt-1 leading-relaxed text-text-secondary">{loveTri.balance.desc}</div>
            </div>
          )}
        </div>
      </div>

      {/* 优势与建议 */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {loveTri.strengths?.length > 0 && (
          <div className="rounded-2xl border border-success/20 bg-success-light/60 px-4 py-4">
            <div className="mb-2 text-sm font-semibold text-success">你的优势</div>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              {loveTri.strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
        )}
        {loveTri.suggestions?.length > 0 && (
          <div className="rounded-2xl border border-info/20 bg-info/10 px-4 py-4">
            <div className="mb-2 text-sm font-semibold text-info">让爱更好的建议</div>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              {loveTri.suggestions.map((s: string, i: number) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* tips / quote / closing */}
      {(Array.isArray(loveTri.tips) ? loveTri.tips.length > 0 : !!loveTri.tips) && (
        <div className="mt-4 rounded-2xl border border-warning/20 bg-warning-light/50 px-4 py-4">
          <div className="mb-2 text-sm font-semibold text-warning">相处小贴士</div>
          {Array.isArray(loveTri.tips) ? (
            <ul className="space-y-1.5 text-sm text-text-secondary">
              {loveTri.tips.map((t: string, i: number) => <li key={i}>✦ {t}</li>)}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-text-secondary">✦ {loveTri.tips}</p>
          )}
        </div>
      )}
      {loveTri.quote && <p className="mt-4 text-center text-sm text-text-muted">「{loveTri.quote}」</p>}
      {loveTri.closing && <p className="mt-2 text-center text-xs text-text-muted">{loveTri.closing}</p>}
    </div>
  );
}
