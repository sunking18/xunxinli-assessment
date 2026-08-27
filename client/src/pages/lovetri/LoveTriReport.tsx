import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';
import { IconHeart, IconTriangle, IconSparkles } from '../../components/Icons';
import LoveTriRadar from './LoveTriRadar';

interface TriDim {
  dimension: string;
  label: string;
  avg: number;
  max: number;
  percent: number;
}
interface LoveTriType {
  key: string;
  cn: string;
  en: string;
  tag: string;
  emoji: string;
  avatarName: string;
  color: string;
  desc: string;
  tips: string;
  quote: string;
  features: string[];
  active: boolean;
  score: number;
}
interface LoveTriData {
  type: string;
  cn: string;
  en: string;
  tag: string;
  color: string;
  emoji: string;
  avatarName: string;
  desc: string;
  features: string[];
  tips: string;
  quote: string;
  triangle: TriDim[];
  dims: { key: string; cn: string; en: string; color: string; score: number; max: number; level: string; percent: number }[];
  balance: { title: string; desc: string };
  types: LoveTriType[];
  strengths?: string[];
  suggestions?: string[];
  closing?: string;
}
interface ShareInfo {
  responseId?: number;
  pairCode?: string;
  partnerName?: string;
  matchedAt?: string;
  shareCode?: string;
}
interface Props {
  data: { loveTri: LoveTriData; resultType: string; score: number };
  assessmentCode: string;
  share?: ShareInfo;
  enablePairMatch?: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  充分: '#16a34a',
  中等: '#d97706',
  萌芽: '#94a3b8',
};

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

// 爱情小人形象：按类型渲染的动画小人
function LoveAvatar({ type }: { type: LoveTriType }) {
  const img = AVATAR_IMG[type.key] || AVATAR_IMG.consummate;
  return (
    <div
      className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full"
      style={{
        background: `radial-gradient(circle at 30% 25%, ${type.color}33, transparent 60%), linear-gradient(160deg, ${type.color}22, transparent)`,
        boxShadow: `0 10px 40px -12px ${type.color}66`,
        border: `2px solid ${type.color}44`,
      }}
    >
      {/* 浮动光斑 */}
      <div className="animate-floaty absolute left-6 top-6 h-3 w-3 rounded-full" style={{ background: type.color, opacity: 0.4 }} />
      <div className="animate-floaty-delayed absolute bottom-7 right-6 h-2.5 w-2.5 rounded-full" style={{ background: type.color, opacity: 0.3 }} />
      {/* 星星光晕 */}
      <div className="animate-pulse-slow absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 50% 60%, ${type.color}22, transparent 70%)` }} />
      {/* 爱情小人 */}
      <img
        src={img}
        alt={type.avatarName}
        className="animate-bob relative z-10 h-28 w-28 object-contain"
      />
    </div>
  );
}

// 一根维度进度条
function DimBar({ d }: { d: LoveTriData['dims'][number] }) {
  const lc = LEVEL_COLORS[d.level] || '#94a3b8';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
          {d.cn}
          <span className="text-xs font-normal text-slate-400">{d.en}</span>
        </span>
        <span className="text-sm font-bold" style={{ color: d.color }}>{d.score}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="animate-grow-bar h-full rounded-full transition-all duration-1000"
          style={{ width: `${d.percent}%`, background: `linear-gradient(90deg, ${d.color}aa, ${d.color})` }}
        />
      </div>
      <div className="mt-1 text-right text-xs text-slate-400">等级：<span className="font-semibold" style={{ color: lc }}>{d.level}</span></div>
    </div>
  );
}

export default function LoveTriReport({ data, assessmentCode, share, enablePairMatch = false }: Props) {
  const tri = data.loveTri;
  const activeType = tri.types.find(t => t.active) || tri.types[0];
  const navigate = useNavigate();
  const { responseId } = useParams<{ responseId: string }>();

  // —— 邀请 TA 一起测（双人配对）——
  const [pairing, setPairing] = useState(false);
  const [pairLink, setPairLink] = useState<string | null>(
    share?.pairCode ? `${location.origin}/fill/${assessmentCode}?pair=${share.pairCode}` : null
  );
  const [copied, setCopied] = useState(false);
  const [pairErr, setPairErr] = useState('');
  const matched = !!(share?.partnerName || share?.matchedAt);

  const genPairLink = async () => {
    if (!share?.responseId) {
      setPairErr('缺少答卷信息，请稍后重试');
      return;
    }
    setPairing(true);
    setPairErr('');
    try {
      const res = await api.post('/love/pair', { responseId: share.responseId });
      setPairLink(`${location.origin}${res.data?.inviteLink}`);
    } catch (e) {
      setPairErr(getErrorMessage(e));
    } finally {
      setPairing(false);
    }
  };

  const copyLink = async () => {
    if (!pairLink) return;
    try {
      await navigator.clipboard.writeText(pairLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setPairErr('复制失败，请长按链接手动复制');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      {/* ===== 顶部 Hero：爱情小人 + 类型名 ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-violet-50 to-indigo-50 p-8 text-center shadow-xl shadow-rose-100/60 ring-1 ring-white/70">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-300/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-violet-300/20 blur-2xl" />

        <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
          <IconHeart className="h-3.5 w-3.5 text-rose-400" /> 斯腾伯格爱情三角 · 你的专属报告
        </p>

        <div className="relative z-10 mb-6 flex justify-center">
          <LoveAvatar type={activeType} />
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-wide" style={{ color: tri.color }}>{tri.cn}</h1>
          <p className="mt-1.5 text-sm font-medium tracking-wider text-slate-400">{tri.en}</p>
        </div>
        <p className="relative z-10 mt-2 text-sm font-medium tracking-widest text-slate-500">{tri.tag}</p>
        <p className="relative z-10 mt-1 text-sm text-slate-400">你的爱情小人：{tri.avatarName}</p>

        <p className="relative z-10 mx-auto mt-6 max-w-xl text-[15px] leading-7 text-slate-600">{tri.desc}</p>

        <div className="relative z-10 mt-5 flex flex-wrap justify-center gap-2">
          {tri.features.map(f => (
            <span key={f} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${tri.color}1a`, color: tri.color }}>
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* ===== 专属寄语 ===== */}
      <section className="mt-6 rounded-2xl border-l-4 bg-white p-5 shadow-sm" style={{ borderColor: tri.color }}>
        <p className="text-lg font-medium italic leading-relaxed text-slate-700">“{tri.quote}”</p>
      </section>

      {/* ===== 爱情三角形态 ===== */}
      <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-800">
          <IconTriangle className="h-5 w-5 text-violet-500" /> 你的爱情三角形态
        </h2>
        <p className="mb-4 text-sm text-slate-400">亲密、激情、承诺三根支柱，构成了你的爱之三角</p>
        <LoveTriRadar triangle={tri.triangle} theme="light" />
        <div className="mt-6 space-y-4">
          {tri.dims.map(d => <DimBar key={d.key} d={d} />)}
        </div>
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-violet-50 to-rose-50 p-4">
          <p className="text-sm font-semibold text-slate-700">{tri.balance.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{tri.balance.desc}</p>
        </div>

        {tri.strengths && tri.strengths.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-100">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800">
              <IconSparkles className="h-5 w-5 text-amber-500" /> 你的爱情三角优势
            </h3>
            <ol className="space-y-3">
              {tri.strengths.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: tri.color }}>{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* ===== 如何让爱更好 ===== */}
      <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
          <IconHeart className="h-5 w-5 text-rose-500" /> 让爱情更好的小建议
        </h2>
        <p className="text-sm leading-7 text-slate-600">{tri.tips}</p>

        {tri.suggestions && tri.suggestions.length > 0 && (
          <ol className="mt-5 space-y-3">
            {tri.suggestions.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-6 text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}

        {tri.closing && (
          <div className="mt-5 rounded-xl border-l-4 border-rose-300 bg-rose-50/60 p-4">
            <p className="text-sm font-medium leading-6 text-rose-800">{tri.closing}</p>
          </div>
        )}
      </section>

      {/* ===== 分享海报入口 ===== */}
      <section className="mt-6 rounded-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 p-6 text-white shadow-lg shadow-rose-200/60">
        <p className="text-sm font-medium opacity-90">分享我的爱情三角</p>
        <p className="mt-2 text-lg font-bold">{tri.cn} · {tri.tag}</p>
        <button
          onClick={() => responseId && navigate(`/report/${responseId}/poster`)}
          className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-rose-600 shadow transition hover:bg-rose-50"
        >
          生成专属分享海报 ✨
        </button>
      </section>

      {/* ===== 邀请 TA 一起测（双人三角匹配） ===== */}
      {enablePairMatch && (
      <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500 p-6 text-white shadow-lg shadow-violet-200/60">
        <p className="text-sm font-medium opacity-90">双人爱情三角</p>
        <p className="mt-2 text-lg font-bold">邀请 TA 一起测，看看你们的三角有多合拍</p>

        {matched && share?.pairCode ? (
          <button
            onClick={() => navigate(`/lovetri/match/${share.pairCode}`)}
            className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-violet-600 shadow transition hover:bg-violet-50"
          >
            查看你们的双人三角匹配报告 💞
          </button>
        ) : pairLink ? (
          <div className="mt-4 rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p className="text-sm font-medium">邀请链接已生成，发给 TA 吧：</p>
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={pairLink}
                onFocus={e => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg bg-white/95 px-3 py-2 text-sm text-slate-800 outline-none"
              />
              <button
                onClick={copyLink}
                className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-50"
              >
                {copied ? '已复制 ✓' : '复制'}
              </button>
            </div>
            <p className="mt-2 text-xs opacity-80">对方测完后，你们就能生成专属的双人三角匹配报告</p>
          </div>
        ) : (
          <>
            <button
              onClick={genPairLink}
              disabled={pairing}
              className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-violet-600 shadow transition hover:bg-violet-50 disabled:opacity-60"
            >
              {pairing ? '生成中…' : '生成邀请链接 💌'}
            </button>
            <p className="mt-3 text-center text-xs opacity-80">对方用你的链接完成测评后，即可查看两人的契合度与匹配报告</p>
          </>
        )}
        {pairErr && <p className="mt-3 text-center text-xs text-white/90">{pairErr}</p>}
      </section>
      )}

      {/* 动画样式 */}
      <style>{`
        @keyframes floaty {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes growBar {
          from { width: 0; }
        }
        .animate-floaty { animation: floaty 3s ease-in-out infinite; }
        .animate-floaty-delayed { animation: floaty 3.6s ease-in-out infinite; animation-delay: .6s; }
        .animate-bob { animation: bob 2.4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulseSlow 3s ease-in-out infinite; }
        .animate-grow-bar { animation: growBar 1s ease-out; }
      `}</style>
    </div>
  );
}
