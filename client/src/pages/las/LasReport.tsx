import { AlertTriangle, Copy, Heart, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import LasHexagon, { type Dim } from './LasHexagon';

interface ReportData {
  las?: {
    primary: {
      key: string;
      cn: string;
      en: string;
      color: string;
      tag: string;
      score: number;
      core: string;
      tip: string;
    };
    secondary: {
      key: string;
      cn: string;
      en: string;
      color: string;
      tag: string;
      score: number;
      core: string;
      tip?: string;
    };
    low: {
      key: string;
      cn: string;
      en: string;
      color: string;
      score: number;
      tip: string;
    };
    combo: string;
    strength: string;
    balance: {
      title: string;
      desc: string;
      near: boolean;
      diff: number;
    };
    warns: string[];
    dims: Dim[];
    ai?: { letter: string; suggestions: string[] } | null;
  };
  resultType?: string;
  levelTag?: string;
  score?: number;
}

const DIM_META: Record<string, { label: string; en: string; color: string; tag: string }> = {
  eros: { label: '浪漫型', en: 'Eros', color: '#F43F5E', tag: '激情 · 一见钟情' },
  ludus: { label: '游戏型', en: 'Ludus', color: '#F59E0B', tag: '享乐 · 自由多变' },
  storge: { label: '同伴型', en: 'Storge', color: '#10B981', tag: '友情 · 细水长流' },
  pragma: { label: '现实型', en: 'Pragma', color: '#3B82F6', tag: '理性 · 条件匹配' },
  mania: { label: '占有型', en: 'Mania', color: '#8B5CF6', tag: '浓烈 · 患得患失' },
  agape: { label: '奉献型', en: 'Agape', color: '#EC4899', tag: '无私 · 无条件付出' },
};

const LEVEL_CLASS: Record<string, string> = {
  明显: 'bg-rose-100 text-rose-600',
  中等: 'bg-amber-100 text-amber-600',
  偏低: 'bg-slate-100 text-slate-500',
};

function parseWarn(text: string): { title: string; body: string } {
  const m = text.match(/^([^：:]+[：:])\s*(.+)$/s);
  if (m) return { title: m[1].trim(), body: m[2].trim() };
  return { title: '特别提醒：', body: text };
}

export default function LasReport({ data, assessmentCode }: { data: ReportData; assessmentCode?: string }) {
  const las = data.las;
  const [copied, setCopied] = useState(false);

  if (!las || !las.dims?.length) {
    return <div className="p-8 text-center text-slate-500">报告数据加载中…</div>;
  }

  const primary = las.primary;
  const secondary = las.secondary;
  const low = las.low;

  const resultText = [
    '【我的爱情六边形】',
    `主色：${primary.cn}（${primary.en}） ${primary.score}/35`,
    `次色：${secondary.cn}（${secondary.en}） ${secondary.score}/35`,
    '',
    '六维得分：',
    ...las.dims.map((d) => `  ${DIM_META[d.key]?.label || d.cn || d.key}${d.en}：${d.score}/35`),
    '',
    '混色解读：',
    las.combo,
    '',
    '色彩平衡度：',
    las.balance.title,
    las.balance.desc,
    '',
    '你的爱情优势：',
    las.strength || '',
    '',
    las.warns.length ? '特别提醒：\n' + las.warns.join('\n') : '',
    '',
    las.ai?.letter ? '给你的温暖寄语：\n' + las.ai.letter : '',
    las.ai?.suggestions?.length ? '\n给你的三个小建议：\n' + las.ai.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') : '',
    '',
    '本测评基于 Hendrick & Hendrick（1986）爱情态度量表（LAS）中文版整理，仅供自我了解与参考，不构成心理诊断。',
  ].join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const secondaryText =
    secondary.core ||
    secondary.tip ||
    `你的次色是${secondary.cn}，它与主色共同构成了你爱情光谱中第二明亮的色彩。拥有这份色彩的你，在关系中既有主色的底色，也不时会流露出${secondary.cn}特有的${secondary.tag || '魅力'}。`;

  const lowText =
    low.tip ||
    `你的${low.cn}得分偏低，代表这种爱的方式目前不是你情感表达的主通道。它并非缺点，只是说明你更容易用其他颜色去爱与被爱。在需要时，也可以有意识地打开这扇窗，让爱情光谱更完整。`;

  return (
    <div className="min-h-screen w-full px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 标题区 */}
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">Love Color Profile</p>
          <h1 className="mt-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 sm:text-4xl">
            你的爱情六边形
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            六种颜色，六种爱的方式。你的内心光谱里，哪一种颜色最亮？
          </p>
        </div>

        {/* 爱情六边形 */}
        <div className="mb-6 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-violet-100/50 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <LasHexagon dims={las.dims} size={420} showLegend={false} />
          </div>
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-600 sm:grid-cols-3">
            {las.dims.map((d) => {
              const meta = DIM_META[d.key] || { label: d.label || d.key, en: d.en || d.key };
              return (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="truncate">
                    {meta.label || d.label || d.key} {meta.en || d.en || d.key} · {d.score}分
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 主色卡（左）+ 爱情混色/色彩平衡度（右） */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* 左侧：主色卡 + 六维进度条 */}
          <div className="flex flex-col rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-violet-100/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-lg"
                style={{ backgroundColor: primary.color }}
              >
                {primary.cn.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-bold text-slate-800">
                  主色 · {primary.cn} {primary.en}（{primary.score}分）· {primary.tag.split(' · ')[0]}
                </div>
                <div className="mt-1.5 text-sm text-slate-500">
                  次色：{secondary.cn} {secondary.en}（{secondary.score}分）· {secondary.tag.split(' · ')[0]}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {las.dims.map((d) => {
                const meta = DIM_META[d.key] || { label: d.label || d.key, en: d.en || d.key, color: d.color, tag: '' };
                const level = d.score >= 29 ? '明显' : d.score >= 22 ? '中等' : '偏低';
                return (
                  <div key={d.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold" style={{ color: meta.color }}>
                        {meta.label || d.label || d.key}{meta.en || d.en || d.key}
                      </span>
                      <span className="text-slate-500">
                        {d.score} / {d.max} <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${LEVEL_CLASS[level]}`}>{level}</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${d.percent}%`, backgroundColor: meta.color }}
                      />
                    </div>
                    {d.levelDesc ? (
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">{d.levelDesc}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右侧：爱情混色 + 色彩平衡度 */}
          <div className="flex h-full flex-col gap-5">
            <div className="flex flex-1 flex-col rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-violet-100/50 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
                <Sparkles className="h-5 w-5 text-violet-500" />
                你的爱情混色
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-50 to-white p-4">
                <div className="flex -space-x-2">
                  <div className="h-10 w-10 rounded-full border-2 border-white shadow" style={{ backgroundColor: primary.color }} />
                  <div className="h-10 w-10 rounded-full border-2 border-white shadow" style={{ backgroundColor: secondary.color }} />
                </div>
                <div>
                  <div className="font-bold text-slate-800">
                    {primary.cn} × {secondary.cn}
                  </div>
                  <div className="text-xs text-slate-500">
                    主色 {primary.en} · {primary.score} 分 ｜ 次色 {secondary.en} · {secondary.score} 分
                  </div>
                </div>
                {las.balance.near && (
                  <span className="ml-auto rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-600">
                    双色主导
                  </span>
                )}
              </div>
              <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">{las.combo || `${primary.cn}与${secondary.cn}的混色，构成了你独特的爱情光谱。主色决定你如何爱人，次色则为这份爱增添另一种温度与节奏。`}</p>
            </div>

            <div className="flex flex-1 flex-col rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-violet-100/50 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800">
                <Heart className="h-5 w-5 text-rose-500" />
                色彩平衡度
              </div>
              <div className="mb-2 inline-block rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-600">
                {las.balance.title || '主导型'}
              </div>
              <p className="flex-1 text-sm leading-7 text-slate-600">{las.balance.desc || '你的六边形呈现出独特的色彩分布，每种颜色都在以不同的亮度参与你的爱情故事。'}</p>
            </div>
          </div>
        </div>

        {/* 你的爱情画像 · 个性化分析 */}
        <div className="mt-6 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-violet-100/50 backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
            你的爱情画像 · 个性化分析
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: primary.color }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary.color }} />
                主色 · {primary.cn} {primary.en}
              </div>
              <p className="text-sm leading-7 text-slate-600">{primary.core || primary.tip || `你的爱情主色是${primary.cn}，这是你在亲密关系中最自然、最频繁的爱的表达方式。`}</p>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: secondary.color }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: secondary.color }} />
                次色 · {secondary.cn} {secondary.en}
              </div>
              <p className="text-sm leading-7 text-slate-600">{secondaryText}</p>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-base font-bold text-violet-700">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                色彩结构 · {las.balance.title || '主导型'}
              </div>
              <p className="text-sm leading-7 text-slate-600">{las.balance.desc || '你的六边形呈现出独特的色彩分布，每种颜色都在以不同的亮度参与你的爱情故事。'}</p>
              {las.balance.near && (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  你的主色与次色得分非常接近，属于「双色主导」，两种色彩几乎平分秋色。
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: low.color }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: low.color }} />
                相对盲区 · {low.cn} {low.en}（{low.score}分）
              </div>
              <p className="text-sm leading-7 text-slate-600">{lowText}</p>
            </div>
          </div>

          {/* 你的爱情优势 */}
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-base font-bold text-emerald-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">优</span>
              你的爱情优势
            </div>
            <p className="text-sm leading-7 text-slate-600">{las.strength || `你的主要爱情优势来自${primary.cn}与${secondary.cn}的组合，在亲密关系里，你拥有独特而宝贵的爱的表达方式。`}</p>
          </div>

          <div className="mt-4 rounded-2xl border border-white/60 bg-gradient-to-r from-violet-50/60 to-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: primary.color }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary.color }} />
              给你的关系建议
            </div>
            <p className="text-sm leading-7 text-slate-600">{primary.tip || primary.core || `作为主色为${primary.cn}的你，在关系中可以继续发挥这份优势，同时留意不因此忽略其他色彩的需求。`}</p>
          </div>
        </div>

        {/* 特别提醒 */}
        {las.warns.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-violet-700">
              <AlertTriangle className="h-5 w-5" />
              特别提醒
            </div>
            {las.warns.map((w, i) => {
              const { title, body } = parseWarn(w);
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-violet-100 bg-white/90 py-5 pl-5 pr-5 shadow-sm backdrop-blur-sm"
                  style={{ borderLeftWidth: '5px', borderLeftColor: '#8B5CF6' }}
                >
                  <p className="mb-2 text-sm font-bold text-violet-700">{title}</p>
                  <p className="text-sm leading-7 text-slate-600">{body}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* 给你的温暖寄语（按 主色×等级 固定话术） */}
        {las.ai && (las.ai.letter || las.ai.suggestions?.length) && (
          <div className="mt-6 overflow-hidden rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-400 p-6 shadow-xl shadow-violet-200/60 sm:p-8">
            <div className="mb-5 flex items-center gap-2 text-base font-bold text-white">
              <Sparkles className="h-5 w-5" />
              给你的温暖寄语
            </div>
            {las.ai.letter && (
              <p className="mb-6 whitespace-pre-line rounded-2xl bg-white/15 p-5 text-[15px] leading-8 text-white backdrop-blur-sm">
                {las.ai.letter}
              </p>
            )}
            {las.ai.suggestions?.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-white/85">给你的三个小建议：</div>
                {las.ai.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl bg-white/12 p-4 backdrop-blur-sm">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-6 text-white">{s}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 免责声明 */}
        <div className="mt-6 rounded-2xl border border-violet-100 bg-white/70 p-6 text-center text-sm leading-7 text-slate-500 shadow-sm backdrop-blur-sm">
          本测评基于 Hendrick & Hendrick（1986）爱情态度量表（LAS）中文版整理，仅供自我了解与参考，不构成心理诊断。
          <br />
          若你在亲密关系中感到持续困扰，建议寻求专业心理咨询的帮助。
        </div>

        {/* 底部操作 */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-500 to-violet-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-200 transition hover:shadow-xl active:scale-95 sm:w-auto"
          >
            <Copy className="h-4 w-4" />
            {copied ? '已复制' : '复制结果文字'}
          </button>
          <Link
            to={`/fill/${assessmentCode || 'las'}`}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-violet-200 bg-white/80 px-8 py-3.5 text-base font-semibold text-violet-600 shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md active:scale-95 sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            重新测评
          </Link>
        </div>
      </div>
    </div>
  );
}
