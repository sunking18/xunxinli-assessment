import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, getErrorMessage } from '../api/client';
import { getBaseUrl } from '../utils/getBaseUrl';
import {
  getAssessmentIcon, IconHeart, IconSparkles, IconShare, IconCopy,
  IconExternal, IconQrCode, IconClipboardList, IconHistory,
} from '../components/Icons';

interface Assessment {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string;
  coverColor: string;
  icon: string;
  fillCount: number;
  questionCount: number;
}

export default function Home() {
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareFor, setShareFor] = useState<Assessment | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [doneCount, setDoneCount] = useState(0);

  const baseUrl = useMemo(() => getBaseUrl(), []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/assessments'),
      api.get('/my/reports').then(r => r.data.data?.doneCodes || []).catch(() => [] as string[]),
    ])
      .then(([assessmentsRes, doneCodes]) => {
        const data: Assessment[] = assessmentsRes.data.data || [];
        const sorted = [...data].sort((a, b) => {
          if (a.code === 'lovetri') return -1;
          if (b.code === 'lovetri') return 1;
          return 0;
        });
        setList(sorted);
        setDoneCount(doneCodes.length);
      })
      .catch(err => alert(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

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
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-green-50 px-6 py-10 shadow-soft lg:px-10 lg:py-14">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
            <IconSparkles size={14} />
            科学 · 温暖 · 可信赖
          </div>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight text-text-primary lg:text-4xl">
            发现内在力量，开启<span className="text-primary">积极成长</span>之旅
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary lg:text-base">
            七大经典测评工具，涵盖性格、情绪、职业与亲子沟通，帮助你和家人更了解自己，建立更温暖的关系。
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/pending" className="btn-primary px-5 py-2.5 text-sm">
              <IconClipboardList size={16} />
              {list.length - doneCount > 0 ? `还有 ${list.length - doneCount} 个待完成` : '查看待完成'}
            </Link>
            <Link to="/my" className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600">
              <IconHistory size={16} />
              我的报告
            </Link>
          </div>
        </div>
      </section>

      {/* 测评列表 */}
      <section className="mt-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">全部测评</h2>
          <span className="text-xs text-text-muted">共 {list.length} 个</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="card py-16 text-center text-text-muted">暂无可用测评</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map(a => (
              <div
                key={a.id}
                className="card card-hover group flex flex-col overflow-hidden transition-all"
              >
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-soft transition-transform duration-300 group-hover:scale-105"
                      style={{ background: a.coverColor }}
                    >
                      {getAssessmentIcon(a.code, 'h-6 w-6')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-text-primary">{a.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">
                        {a.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary">
                      {a.category}
                    </span>
                    <span className="rounded-full bg-background px-2.5 py-0.5 text-xs text-text-secondary">
                      {a.questionCount} 题
                    </span>
                    <span className="rounded-full bg-background px-2.5 py-0.5 text-xs text-text-secondary">
                      {a.fillCount} 人已测
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-border bg-background/50 p-3">
                  <Link
                    to={`/fill/${a.code}`}
                    className="btn-primary flex-1 py-2 text-sm"
                  >
                    开始测评
                  </Link>
                  <button
                    onClick={() => setShareFor(a)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-text-secondary shadow-sm transition hover:bg-primary-light hover:text-primary"
                    title="转发给好友"
                  >
                    <IconShare size={16} />
                    分享
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
                转发测评给好友
              </h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setShareFor(null)}>✕</button>
            </div>

            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ background: shareFor.coverColor }}
                >
                  {getAssessmentIcon(shareFor.code, 'h-5 w-5')}
                </div>
                <div>
                  <div className="font-medium text-text-primary">{shareFor.name}</div>
                  <div className="text-xs text-text-muted">{shareFor.category} · {shareFor.questionCount} 题</div>
                </div>
              </div>

              <div className="flex flex-col items-center py-5">
                <div className="rounded-xl border border-border bg-white p-2 shadow-card">
                  <QRCodeSVG
                    value={`${baseUrl}/fill/${shareFor.code}`}
                    size={180}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#3D405B"
                  />
                </div>
                <p className="mt-3 text-xs text-text-muted">微信扫码或复制链接分享给好友</p>
              </div>

              <div className="rounded-lg bg-background px-3 py-2 text-center font-mono text-xs text-text-secondary break-all">
                {baseUrl}/fill/{shareFor.code}
              </div>
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
                打开测评
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
