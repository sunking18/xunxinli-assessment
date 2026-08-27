import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';

interface TriangleData {
  intimacy: number;
  passion: number;
  commitment: number;
  tag: string;
  responseId: number;
  name: string;
  createdAt: string;
}

interface MatchData {
  ready: boolean;
  count?: number;
  message?: string;
  overlap?: number;
  a?: TriangleData;
  b?: TriangleData;
  diffs?: { dimension: string; a: number; b: number; diff: number }[];
  advice?: string[];
  assessment?: { id: number; code: string; name: string; coverColor: string };
}

// 双人三角雷达图（两人叠加）
function MatchTriangle({ a, b }: { a: TriangleData; b: TriangleData }) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2 + 12;
  const r = 104;
  const labels = ['亲密', '激情', '承诺'];
  const keys = ['intimacy', 'passion', 'commitment'] as const;
  const angles = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6];
  const pts = angles.map(ang => [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);

  const toPolygon = (data: TriangleData) =>
    keys
      .map((k, i) => {
        const v = Math.max(0, Math.min(100, data[k])) / 100;
        return `${cx + r * v * Math.cos(angles[i])},${cy + r * v * Math.sin(angles[i])}`;
      })
      .join(' ');

  const polyA = toPolygon(a);
  const polyB = toPolygon(b);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <linearGradient id="matchFillA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8738c" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c4705a" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="matchFillB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fb7e8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5a7db2" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {[0.33, 0.66, 1].map(t => (
        <polygon
          key={t}
          points={pts.map(p => `${cx + (p[0] - cx) * t},${cy + (p[1] - cy) * t}`).join(' ')}
          fill={t === 0.33 ? '#fffafb' : 'none'}
          stroke={t === 1 ? '#f0cdd6' : '#f6e0e6'}
          strokeWidth={t === 1 ? 1.6 : 1.2}
          strokeDasharray={t === 1 ? undefined : '5 5'}
        />
      ))}
      {pts.map((p, i) => (
        <line key={`ax${i}`} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="#f6e0e6" strokeWidth="1.2" />
      ))}

      <polygon points={polyA} fill="url(#matchFillA)" stroke="#e8738c" strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points={polyB} fill="url(#matchFillB)" stroke="#7ba3d8" strokeWidth="2.5" strokeLinejoin="round" />

      {pts.map((p, i) => {
        const lx = Math.max(60, Math.min(size - 60, p[0]));
        const top = i === 0;
        const ly = p[1] + (top ? -30 : 40);
        return (
          <g key={`label${i}`}>
            <rect x={lx - 50} y={ly - 25} width="100" height="50" rx="14" fill="#ffffff" stroke="#e0cdd6" strokeOpacity="0.6" strokeWidth="1" />
            <text x={lx} y={ly - 8} textAnchor="middle" fontSize="11" fill="#8a7469" fontWeight="500">
              {labels[i]}
            </text>
            <text x={lx} y={ly + 14} textAnchor="middle" fontSize="14" fill="#c4705a" fontWeight="700">
              {a[keys[i]]} / {b[keys[i]]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Match() {
  const { pairCode } = useParams<{ pairCode: string }>();
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/love/match/${pairCode}`);
      setData(res.data.data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, '匹配报告加载失败'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairCode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 px-4">
        <div className="text-5xl">💔</div>
        <div className="text-text-secondary">{error || '匹配报告不存在'}</div>
        <Link to="/" className="btn-primary">返回首页</Link>
      </div>
    );
  }

  // 等待伴侣完成
  if (!data.ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 pb-16">
        <header className="border-b border-white/60 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/xunxinli-avatar-cream.png" alt="寻心理" className="h-9 w-9 rounded-xl object-cover" />
              <span className="font-semibold text-text-primary">寻心理测评平台</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-10">
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fff0f3] text-4xl">⏳</div>
            <h1 className="mt-4 text-2xl font-bold text-[#c4705a]">等待伴侣完成测评</h1>
            <p className="mx-auto mt-3 max-w-md leading-relaxed text-text-secondary">
              对方完成测评后，即可生成专属于你们的「双人爱情匹配报告」。
            </p>
            <div className="mx-auto mt-5 max-w-xs rounded-xl border border-border bg-background px-4 py-3 text-sm">
              <div className="text-text-muted">已完成的作答</div>
              <div className="mt-1 text-2xl font-bold text-primary">{data.count} / 2</div>
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <Link to="/" className="btn-secondary">返回首页</Link>
              <button className="btn-primary" onClick={() => { setRefreshing(true); load(); }} disabled={refreshing}>
                {refreshing ? '刷新中...' : '刷新状态'}
              </button>
            </div>
            {data.message && <p className="mt-4 text-sm text-text-muted">{data.message}</p>}
          </div>
        </main>
      </div>
    );
  }

  const { a, b, overlap = 0, diffs = [], advice = [] } = data;
  const color = data.assessment?.coverColor || '#e8738c';

  // 匹配度文案
  const matchLevel = overlap >= 75
    ? { text: '天作之合', desc: '你们的爱情三角高度重叠，彼此的付出与期待非常一致，是令人羡慕的默契组合。', emoji: '💞' }
    : overlap >= 55
      ? { text: '契合伴侣', desc: '你们的爱情三角大体契合，偶有差异，而这些差异恰好是彼此学习的空间。', emoji: '💗' }
      : { text: '磨合进行时', desc: '你们的爱情三角差异较明显，这提醒你们：需要认真倾听彼此对这段关系的真实期待。', emoji: '💭' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 pb-16">
      <header className="border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/xunxinli-avatar-cream.png" alt="寻心理" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-semibold text-text-primary">寻心理测评平台</span>
          </Link>
          <span className="rounded-full bg-[#fff0f3] px-3 py-1 text-xs font-medium text-[#c4705a]">配对码 {pairCode}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-8">
        {/* 封面 */}
        <div className="card overflow-hidden">
          <div className="h-36" style={{ background: `linear-gradient(135deg, ${color}, #a84a70)` }} />
          <div className="-mt-16 px-6 pb-6 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-4xl shadow-xl">
              💞
            </div>
            <h1 className="mt-3 text-2xl font-bold text-text-primary">双人爱情匹配报告</h1>
            <p className="mt-1.5 text-sm text-text-muted">
              {a!.name} 与 {b!.name}
            </p>
          </div>
        </div>

        {/* 匹配度 */}
        <div className="card mt-6 p-6 text-center sm:p-8">
          <div className="text-sm text-text-secondary">你们的爱情契合度</div>
          <div className="mt-2 text-5xl font-bold" style={{ color }}>
            {overlap}%
          </div>
          <div className="mx-auto mt-3 h-3 max-w-sm overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${overlap}%`, background: `linear-gradient(90deg, #e8738c, ${color})` }}
            />
          </div>
          <div className="mt-4 text-xl font-bold text-[#c4705a]">{matchLevel.emoji} {matchLevel.text}</div>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-text-secondary">{matchLevel.desc}</p>
        </div>

        {/* 双人雷达图 */}
        <div className="card mt-6 p-6 text-center sm:p-8">
          <h2 className="text-lg font-semibold text-text-primary">你们的爱情三角</h2>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-text-muted">
            粉色为 {a!.name}，蓝色为 {b!.name}。重叠越多，代表你们在亲密、激情与承诺上的投入越一致。
          </p>
          <div className="mt-4">
            <MatchTriangle a={a!} b={b!} />
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-text-secondary">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#e8738c]" /> {a!.name}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#7ba3d8]" /> {b!.name}
            </span>
          </div>
        </div>

        {/* 双方结果 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card border-[#e8738c]/25 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0f3] text-lg font-bold text-[#e8738c]">
              {a!.name[0] || 'A'}
            </div>
            <div className="mt-3 text-lg font-bold text-text-primary">{a!.name}</div>
            <div className="mt-1 inline-block rounded-full bg-[#fff0f3] px-3 py-1 text-sm font-medium text-[#c4705a]">
              {a!.tag}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {(['intimacy', 'passion', 'commitment'] as const).map(k => (
                <div key={k} className="rounded-lg bg-background py-2">
                  <div className="text-xs text-text-muted">{{ intimacy: '亲密', passion: '激情', commitment: '承诺' }[k]}</div>
                  <div className="mt-0.5 text-base font-bold text-text-primary">{a![k]}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card border-[#7ba3d8]/25 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eff5fd] text-lg font-bold text-[#5a7db2]">
              {b!.name[0] || 'B'}
            </div>
            <div className="mt-3 text-lg font-bold text-text-primary">{b!.name}</div>
            <div className="mt-1 inline-block rounded-full bg-[#eff5fd] px-3 py-1 text-sm font-medium text-[#5a7db2]">
              {b!.tag}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {(['intimacy', 'passion', 'commitment'] as const).map(k => (
                <div key={k} className="rounded-lg bg-background py-2">
                  <div className="text-xs text-text-muted">{{ intimacy: '亲密', passion: '激情', commitment: '承诺' }[k]}</div>
                  <div className="mt-0.5 text-base font-bold text-text-primary">{b![k]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 差异分析 */}
        {diffs.length > 0 && (
          <div className="card mt-6 p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#c4705a]">
              <span className="h-4 w-1 rounded-full bg-[#c4705a]" />
              维度差异
            </h2>
            <div className="space-y-4">
              {diffs.map(d => {
                const labelMap: Record<string, string> = { intimacy: '亲密', passion: '激情', commitment: '承诺' };
                const diffPct = Math.min(100, Math.round((d.diff / 100) * 100));
                return (
                  <div key={d.dimension}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-text-primary">{labelMap[d.dimension] || d.dimension}</span>
                      <span className="text-text-muted">差 {d.diff} 分</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${diffPct}%`,
                          background: d.diff >= 30 ? 'linear-gradient(90deg,#e8738c,#ea580c)' : 'linear-gradient(90deg,#e8a06a,#c4705a)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 建议 */}
        {advice.length > 0 && (
          <div className="card mt-6 p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-info">
              <span className="h-4 w-1 rounded-full bg-info" />
              关系锦囊
            </h2>
            <div className="grid gap-3">
              {advice.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl bg-info/10 px-4 py-3 text-sm text-text-primary">
                  <span className="mt-0.5 shrink-0 text-info">✦</span>
                  <span className="leading-relaxed">{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部操作 */}
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="btn-secondary">更多测评</Link>
          <Link to={`/fill/${data.assessment?.code || 'love'}`} className="btn-primary">再测一次</Link>
        </div>
      </main>
    </div>
  );
}
