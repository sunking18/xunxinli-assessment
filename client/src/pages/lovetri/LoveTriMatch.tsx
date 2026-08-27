import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';

interface LoveTriTypeInfo {
  type: string | null;
  cn: string;
  en: string | null;
  tag: string | null;
  emoji: string;
  avatarName: string;
  color: string;
}
interface PlayerData {
  intimacy: number;
  passion: number;
  commitment: number;
  intimacyAvg: number;
  passionAvg: number;
  commitmentAvg: number;
  tag: string;
  loveTri?: LoveTriTypeInfo;
  responseId: number;
  name: string;
  createdAt: string;
}
interface MatchData {
  ready: boolean;
  count?: number;
  message?: string;
  overlap?: number;
  a?: PlayerData;
  b?: PlayerData;
  diffs?: { dimension: string; a: number; b: number; diff: number }[];
  advice?: string[];
  assessment?: { id: number; code: string; name: string; coverColor: string };
}

// 爱情小人图片映射
const AVATAR_IMG: Record<string, string> = {
  consummate: '/lovetri-avatars/consummate.png',
  romantic: '/lovetri-avatars/romantic.png',
  companionate: '/lovetri-avatars/companionate.png',
  fatuous: '/lovetri-avatars/fatuous.png',
  liking: '/lovetri-avatars/liking.png',
  infatuated: '/lovetri-avatars/infatuated.png',
  empty: '/lovetri-avatars/empty.png',
};

const LABEL_MAP: Record<string, string> = { intimacy: '亲密', passion: '激情', commitment: '承诺' };

// 双人叠加三角雷达（炫彩星空主题）
function MatchTriangle({ a, b }: { a: PlayerData; b: PlayerData }) {
  const size = 360;
  const cx = size / 2;
  const cy = size / 2 + 14;
  const r = 110;
  const keys = ['intimacy', 'passion', 'commitment'] as const;
  const angles = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6];
  const pts = angles.map(ang => [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);

  const toPolygon = (data: PlayerData) =>
    keys
      .map((k, i) => {
        const v = Math.max(0, Math.min(100, data[k])) / 100;
        return `${cx + r * v * Math.cos(angles[i])},${cy + r * v * Math.sin(angles[i])}`;
      })
      .join(' ');

  const colorA = a.loveTri?.color || '#f472b6';
  const colorB = b.loveTri?.color || '#818cf8';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <linearGradient id="ltmFillA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorA} stopOpacity="0.5" />
          <stop offset="100%" stopColor={colorA} stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="ltmFillB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorB} stopOpacity="0.5" />
          <stop offset="100%" stopColor={colorB} stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {[0.33, 0.66, 1].map(t => (
        <polygon
          key={t}
          points={pts.map(p => `${cx + (p[0] - cx) * t},${cy + (p[1] - cy) * t}`).join(' ')}
          fill={t === 0.33 ? 'rgba(255,255,255,0.04)' : 'none'}
          stroke={t === 1 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)'}
          strokeWidth={t === 1 ? 1.6 : 1}
          strokeDasharray={t === 1 ? undefined : '5 5'}
        />
      ))}
      {pts.map((p, i) => (
        <line key={`ax${i}`} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      ))}

      <polygon points={toPolygon(a)} fill="url(#ltmFillA)" stroke={colorA} strokeWidth="2.6" strokeLinejoin="round" />
      <polygon points={toPolygon(b)} fill="url(#ltmFillB)" stroke={colorB} strokeWidth="2.6" strokeLinejoin="round" />

      {pts.map((p, i) => {
        const lx = Math.max(64, Math.min(size - 64, p[0]));
        const top = i === 0;
        const ly = p[1] + (top ? -32 : 42);
        return (
          <g key={`label${i}`}>
            <rect x={lx - 54} y={ly - 26} width="108" height="52" rx="14" fill="rgba(20,8,40,0.85)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            <text x={lx} y={ly - 9} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.55)" fontWeight="500">
              {LABEL_MAP[keys[i]]}
            </text>
            <text x={lx} y={ly + 15} textAnchor="middle" fontSize="14" fill="#ffffff" fontWeight="700">
              {a[keys[i]]} / {b[keys[i]]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 单个玩家类型卡片
function PlayerCard({ player, isA }: { player: PlayerData; isA: boolean }) {
  const lt = player.loveTri;
  const color = lt?.color || (isA ? '#f472b6' : '#818cf8');
  const img = lt?.type ? AVATAR_IMG[lt.type] : AVATAR_IMG.consummate;
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-white/5 p-6 text-center backdrop-blur" style={{ borderColor: `${color}55` }}>
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `${color}44` }}
      />
      <div
        className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${color}33, transparent 60%)`,
          boxShadow: `0 8px 30px -10px ${color}88`,
          border: `2px solid ${color}55`,
        }}
      >
        <img src={img} alt={lt?.avatarName || player.name} className="h-14 w-14 object-contain" />
      </div>
      <div className="mt-3 text-lg font-bold text-white">{player.name}</div>
      <div className="mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium" style={{ background: `${color}22`, color }}>
        {lt?.emoji || '💞'} {lt?.cn || player.tag || '爱情三角'}
      </div>
      {lt?.en && <div className="mt-1 text-[11px] tracking-widest text-white/40">{lt.en}</div>}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {(['intimacy', 'passion', 'commitment'] as const).map(k => (
          <div key={k} className="rounded-xl bg-black/20 py-2">
            <div className="text-[11px] text-white/45">{LABEL_MAP[k]}</div>
            <div className="mt-0.5 text-base font-bold text-white">{Math.round(player[`${k}Avg`] * 10) / 10}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoveTriMatch() {
  const { pairCode = '' } = useParams<{ pairCode: string }>();
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
      <div className="flex min-h-screen items-center justify-center bg-[#150b36]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-fuchsia-400/20 border-t-fuchsia-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#150b36] px-4">
        <div className="text-5xl">💔</div>
        <div className="text-white/70">{error || '匹配报告不存在'}</div>
        <Link to="/" className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg">
          返回首页
        </Link>
      </div>
    );
  }

  // 等待伴侣完成
  if (!data.ready) {
    return (
      <div className="min-h-screen bg-[#150b36] pb-16">
        <header className="border-b border-white/10 bg-[#1d0f45]/70 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/lovetri-avatars/consummate.png" alt="爱情三角" className="h-9 w-9 rounded-xl object-cover" />
              <span className="font-semibold text-white">爱情三角 · 双人匹配</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-4xl">⏳</div>
            <h1 className="mt-4 text-2xl font-bold text-white">等待 TA 完成测评</h1>
            <p className="mx-auto mt-3 max-w-md leading-relaxed text-white/60">
              对方完成测评后，即可生成专属于你们的「双人爱情三角匹配报告」。
            </p>
            <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-sm text-white/50">已完成的作答</div>
              <div className="mt-1 text-2xl font-bold text-fuchsia-300">{data.count} / 2</div>
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <Link to="/" className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80">返回首页</Link>
              <button
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
                onClick={() => { setRefreshing(true); load(); }}
                disabled={refreshing}
              >
                {refreshing ? '刷新中...' : '刷新状态'}
              </button>
            </div>
            {data.message && <p className="mt-4 text-sm text-white/50">{data.message}</p>}
          </div>
        </main>
      </div>
    );
  }

  const { a, b, overlap = 0, diffs = [], advice = [] } = data;
  const colorA = a!.loveTri?.color || '#f472b6';
  const colorB = b!.loveTri?.color || '#818cf8';

  const matchLevel = overlap >= 75
    ? { text: '天作之合', desc: '你们的爱情三角高度重叠，彼此的付出与期待非常一致，是令人羡慕的默契组合。', emoji: '💞' }
    : overlap >= 55
      ? { text: '契合伴侣', desc: '你们的爱情三角大体契合，偶有差异，而这些差异恰好是彼此学习的空间。', emoji: '💗' }
      : { text: '磨合进行时', desc: '你们的爱情三角差异较明显，这提醒你们：需要认真倾听彼此对这段关系的真实期待。', emoji: '💭' };

  return (
    <div className="min-h-screen bg-[#150b36] pb-16" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 0%, rgba(139,92,246,0.18), transparent 55%), radial-gradient(ellipse at 90% 20%, rgba(244,114,182,0.14), transparent 50%)' }}>
      <header className="border-b border-white/10 bg-[#1d0f45]/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/lovetri-avatars/consummate.png" alt="爱情三角" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-semibold text-white">爱情三角 · 双人匹配</span>
          </Link>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/60">配对码 {pairCode}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-8">
        {/* 封面 */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
          <div
            className="h-32"
            style={{ background: `linear-gradient(135deg, ${colorA}88, ${colorB}88)` }}
          />
          <div className="-mt-14 px-6 pb-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#1d0f45] text-4xl shadow-xl ring-2 ring-white/20">
              {matchLevel.emoji}
            </div>
            <h1 className="mt-3 text-2xl font-bold text-white">双人爱情三角匹配报告</h1>
            <p className="mt-1.5 text-sm text-white/60">
              {a!.name} 与 {b!.name} 的爱情三角
            </p>
          </div>
        </div>

        {/* 匹配度 */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur sm:p-8">
          <div className="text-sm text-white/60">你们的爱情契合度</div>
          <div
            className="mt-2 text-6xl font-black"
            style={{ background: `linear-gradient(90deg, ${colorA}, ${colorB})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {overlap}%
          </div>
          <div className="mx-auto mt-4 h-3 max-w-sm overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${overlap}%`, background: `linear-gradient(90deg, ${colorA}, ${colorB})` }}
            />
          </div>
          <div className="mt-4 text-xl font-bold text-white">{matchLevel.emoji} {matchLevel.text}</div>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-white/60">{matchLevel.desc}</p>
        </div>

        {/* 双人雷达 */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur sm:p-8">
          <h2 className="text-lg font-semibold text-white">你们的爱情三角</h2>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-white/50">
            {colorA === '#f472b6' ? '粉色' : '暖色'}为 {a!.name}，{colorB === '#818cf8' ? '蓝紫' : '冷色'}为 {b!.name}。重叠越多，代表你们在亲密、激情与承诺上的投入越一致。
          </p>
          <div className="mt-4">
            <MatchTriangle a={a!} b={b!} />
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-white/70">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: colorA }} /> {a!.name}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: colorB }} /> {b!.name}
            </span>
          </div>
        </div>

        {/* 双方类型 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <PlayerCard player={a!} isA />
          <PlayerCard player={b!} isA={false} />
        </div>

        {/* 维度差异 */}
        {diffs.length > 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <span className="h-4 w-1 rounded-full bg-fuchsia-400" />
              维度差异
            </h2>
            <div className="space-y-4">
              {diffs.map(d => {
                const diffPct = Math.min(100, d.diff);
                return (
                  <div key={d.dimension}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-white/85">{LABEL_MAP[d.dimension] || d.dimension}</span>
                      <span className="text-white/50">差 {d.diff} 分</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/30">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${diffPct}%`,
                          background: d.diff >= 30 ? 'linear-gradient(90deg,#f472b6,#f43f5e)' : 'linear-gradient(90deg,#c084fc,#a78bfa)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 关系锦囊 */}
        {advice.length > 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <span className="h-4 w-1 rounded-full bg-violet-400" />
              关系锦囊
            </h2>
            <div className="grid gap-3">
              {advice.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/85">
                  <span className="mt-0.5 shrink-0 text-fuchsia-300">✦</span>
                  <span className="leading-relaxed">{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部操作 */}
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80">更多测评</Link>
          <Link to={`/fill/${data.assessment?.code || 'lovetri'}`} className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
            再测一次
          </Link>
        </div>
      </main>
    </div>
  );
}
