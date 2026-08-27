import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, getErrorMessage } from '../api/client';
import { getBaseUrl } from '../utils/getBaseUrl';
import {
  getAssessmentIcon, IconClipboardList, IconSparkles, IconShare,
  IconCopy, IconExternal, IconHistory,
} from '../components/Icons';

interface Assessment {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string;
  coverColor: string;
  icon: string;
  questionCount: number;
  fillCount: number;
}

export default function UserPending() {
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareFor, setShareFor] = useState<Assessment | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const baseUrl = useMemo(() => getBaseUrl(), []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/assessments'),
      api.get('/my/reports').then(r => r.data.data?.doneCodes || []).catch(() => [] as string[]),
    ])
      .then(([assessmentsRes, doneCodes]) => {
        setList(assessmentsRes.data.data || []);
        setCompleted(doneCodes);
      })
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const pending = list.filter(a => !completed.includes(a.code));
  const done = list.filter(a => completed.includes(a.code));

  const copyLink = async (code: string, id: number) => {
    const url = `${baseUrl}/fill/${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <IconClipboardList size={22} className="text-primary" />
          待完成测评
        </h1>
        <p className="mt-1 text-sm text-text-muted">继续你还未完成的测评，或分享给需要的人</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : pending.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <IconSparkles size={28} />
          </div>
          <h3 className="text-base font-semibold text-text-primary">太棒了，当前没有待完成测评</h3>
          <p className="mt-2 text-sm text-text-muted">你已经完成了全部 {done.length} 个测评</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/" className="btn-secondary px-5 py-2.5 text-sm">
              返回首页
            </Link>
            <Link to="/my" className="btn-primary px-5 py-2.5 text-sm">
              <IconHistory size={16} />
              我的报告
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-2 text-sm text-text-muted">还有 {pending.length} 个测评等待完成</div>
          <div className="space-y-4">
            {pending.map(a => (
              <div key={a.id} className="card card-hover flex flex-col gap-4 p-5 transition-all sm:flex-row sm:items-center">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-soft"
                  style={{ background: a.coverColor }}
                >
                  {getAssessmentIcon(a.code, 'h-6 w-6')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-text-primary">{a.name}</h3>
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      {a.category}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-text-muted">{a.description}</p>
                  <div className="mt-2 text-xs text-text-secondary">{a.questionCount} 题 · {a.fillCount} 人已测</div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                  <Link to={`/fill/${a.code}`} className="btn-primary px-4 py-2 text-sm text-center">
                    去填写
                  </Link>
                  <button
                    onClick={() => setShareFor(a)}
                    className="flex items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-text-secondary shadow-sm transition hover:bg-primary-light hover:text-primary"
                  >
                    <IconShare size={14} />
                    分享
                  </button>
                </div>
              </div>
            ))}
          </div>

          {done.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">已完成</h2>
              <div className="flex flex-wrap gap-2">
                {done.map(a => (
                  <Link
                    key={a.code}
                    to={`/fill/${a.code}`}
                    className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs text-text-secondary transition hover:border-primary hover:text-primary"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: a.coverColor }}
                    />
                    {a.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 分享弹窗 */}
      {shareFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShareFor(null)}
        >
          <div
            className="card w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-text-primary">
                <IconShare size={18} className="text-primary" />
                分享给好友填写
              </h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setShareFor(null)}>✕</button>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-border bg-white p-4">
              <QRCodeSVG
                value={`${baseUrl}/fill/${shareFor.code}`}
                size={180}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#3D405B"
              />
              <p className="mt-3 text-xs text-text-muted">微信扫码直接填写</p>
            </div>
            <div className="mt-3 rounded-lg bg-background px-3 py-2 text-center font-mono text-xs text-text-secondary break-all">
              {baseUrl}/fill/{shareFor.code}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => copyLink(shareFor.code, shareFor.id)}
                className="btn-primary flex-1 py-2.5 text-sm"
              >
                {copiedId === shareFor.id ? '已复制' : <><IconCopy size={16} /> 复制链接</>}
              </button>
              <a
                href={`${baseUrl}/fill/${shareFor.code}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary flex-1 py-2.5 text-sm text-center"
              >
                <IconExternal size={16} />
                打开
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
