import { useEffect, useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api, getErrorMessage } from '../../api/client';
import { getBaseUrl } from '../../utils/getBaseUrl';
import { getAssessmentIcon, IconCopy, IconExternal, IconQrCode, IconShare } from '../../components/Icons';

interface AssessmentItem {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string;
  coverColor: string;
  icon: string;
  status: string;
  fillCount: number;
  questionCount: number;
}

interface DistributeRecord {
  id: number;
  assessmentId: number;
  code: string;
  url: string;
  createdAt: string;
  assessment?: { name: string; coverColor: string };
}

export default function AdminDistribute() {
  const [list, setList] = useState<AssessmentItem[]>([]);
  const [records, setRecords] = useState<DistributeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareFor, setShareFor] = useState<AssessmentItem | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const baseUrl = useMemo(() => getBaseUrl(), []);

  const load = async () => {
    setLoading(true);
    try {
      const [assRes] = await Promise.all([
        api.get('/admin/assessments'),
      ]);
      setList((assRes.data.data || []).filter((a: AssessmentItem) => a.status === 'published'));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const saved = localStorage.getItem('distribute_records');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  const copyLink = async (code: string, id?: number) => {
    const url = `${baseUrl}/fill/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      if (id !== undefined) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      }
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      if (id !== undefined) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      }
    }
  };

  const addRecord = (a: AssessmentItem) => {
    const url = `${baseUrl}/fill/${a.code}`;
    const record: DistributeRecord = {
      id: Date.now(),
      assessmentId: a.id,
      code: a.code,
      url,
      createdAt: new Date().toISOString(),
      assessment: { name: a.name, coverColor: a.coverColor },
    };
    const next = [record, ...records].slice(0, 20);
    setRecords(next);
    localStorage.setItem('distribute_records', JSON.stringify(next));
  };

  const deleteRecord = (id: number) => {
    const next = records.filter(r => r.id !== id);
    setRecords(next);
    localStorage.setItem('distribute_records', JSON.stringify(next));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">测评分发</h1>
        <p className="mt-1 text-sm text-text-muted">扫码或复制链接，将测评分享给被测用户</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map(a => {
              const url = `${baseUrl}/fill/${a.code}`;
              return (
                <div
                  key={a.id}
                  className="card card-hover flex flex-col overflow-hidden transition-all"
                >
                  <div className="flex items-start gap-4 p-5">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-soft"
                      style={{ background: a.coverColor }}
                    >
                      {getAssessmentIcon(a.code, 'h-6 w-6')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-text-primary">{a.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">{a.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-primary-light px-2 py-0.5 font-medium text-primary">{a.category}</span>
                        <span className="rounded-full bg-background px-2 py-0.5 text-text-secondary">已发布</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center border-t border-dashed border-border bg-white/50 px-5 py-5">
                    <button
                      onClick={() => setShareFor(a)}
                      className="group relative flex flex-col items-center gap-2"
                    >
                      <div className="rounded-xl border border-border bg-white p-2 shadow-card transition group-hover:border-primary/30 group-hover:shadow-soft">
                        <QRCodeSVG
                          value={url}
                          size={108}
                          level="M"
                          includeMargin={false}
                          bgColor="#ffffff"
                          fgColor="#3D405B"
                        />
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <IconQrCode size={14} />
                        点击放大
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 border-t border-border bg-background/50 p-3">
                    <button
                      onClick={() => copyLink(a.code, a.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-xs font-medium text-text-secondary shadow-sm transition hover:bg-primary-light hover:text-primary"
                    >
                      {copiedId === a.id ? '已复制' : <><IconCopy size={14} /> 复制链接</>}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-xs font-medium text-text-secondary shadow-sm transition hover:bg-primary-light hover:text-primary"
                    >
                      <IconExternal size={14} />
                      打开测评
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {records.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-base font-semibold text-text-primary">最近分发</h2>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-background text-xs text-text-muted">
                        <th className="px-5 py-3 font-medium">测评</th>
                        <th className="px-4 py-3 font-medium">分发时间</th>
                        <th className="px-4 py-3 font-medium">链接</th>
                        <th className="px-4 py-3 text-right font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {records.map(r => (
                        <tr key={r.id} className="transition hover:bg-background">
                          <td className="px-5 py-3.5 font-medium text-text-primary">{r.assessment?.name || r.code}</td>
                          <td className="px-4 py-3.5 text-text-secondary">{new Date(r.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-3.5">
                            <code className="max-w-xs truncate rounded bg-background px-2 py-0.5 font-mono text-xs text-text-secondary block">{r.url}</code>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => copyLink(r.code, r.id + 10000)}
                                className="rounded-lg p-2 text-text-muted transition hover:bg-primary-light hover:text-primary"
                                title="复制链接"
                              >
                                {copiedId === r.id + 10000 ? <span className="text-xs">已复制</span> : <IconCopy size={16} />}
                              </button>
                              <button
                                onClick={() => deleteRecord(r.id)}
                                className="rounded-lg p-2 text-text-muted transition hover:bg-danger/10 hover:text-danger"
                                title="删除记录"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <IconShare size={18} className="text-primary" />
                分享给被测用户
              </h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setShareFor(null)}>✕</button>
            </div>
            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCodeSVG
                value={`${baseUrl}/fill/${shareFor.code}`}
                size={220}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#3D405B"
              />
            </div>
            <div className="mt-4 text-center">
              <div className="font-medium text-text-primary">{shareFor.name}</div>
              <div className="mt-1 text-xs text-text-muted">微信扫码或手机浏览器访问</div>
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
                打开测评
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
