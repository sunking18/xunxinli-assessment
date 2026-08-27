import { ArrowRight } from 'lucide-react';
import SurveyHeader from '../../components/SurveyHeader';

const TYPES = [
  { key: 'eros', label: '浪漫型', en: 'Eros', tag: '激情 · 一见钟情', color: '#F43F5E', bg: '#FFF1F2' },
  { key: 'ludus', label: '游戏型', en: 'Ludus', tag: '享乐 · 自由多变', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'storge', label: '同伴型', en: 'Storge', tag: '友情 · 细水长流', color: '#10B981', bg: '#ECFDF5' },
  { key: 'pragma', label: '现实型', en: 'Pragma', tag: '理性 · 条件匹配', color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'mania', label: '占有型', en: 'Mania', tag: '浓烈 · 患得患失', color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'agape', label: '奉献型', en: 'Agape', tag: '无私 · 无条件付出', color: '#EC4899', bg: '#FDF2F8' },
];

export default function LasWelcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#FDF4FF] via-[#F5F3FF] to-[#EEF2FF]">
      <SurveyHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 text-center sm:py-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-rose-300 via-amber-300 to-violet-400 shadow-lg shadow-violet-200/60">
          <img src="/las-icon.svg" alt="LAS 爱情态度测评" className="h-11 w-11" />
        </div>

        <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 sm:text-4xl">
          你的爱情，是什么颜色？
        </h1>

        <p className="mb-2 text-base text-slate-700 sm:text-lg">
          六色爱情测评 · 基于 Hendrick & Hendrick（1986）《爱情态度量表》
        </p>
        <p className="mb-8 text-sm text-slate-500 sm:text-base">
          理论源头：John Alan Lee（1973）「爱的颜色理论」—— 爱情并非一种，而是六种。
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {TYPES.map((t) => (
            <div
              key={t.key}
              className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div
                className="mx-auto mb-3 h-10 w-10 rounded-full shadow"
                style={{ backgroundColor: t.color }}
              />
              <div className="text-base font-bold text-slate-800">
                {t.label} {t.en}
              </div>
              <div className="mt-1 text-xs text-slate-500">{t.tag}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-violet-200 bg-white/70 p-5 text-sm leading-7 text-slate-600 backdrop-blur-sm sm:text-base">
          共 42 题，约 5 分钟。请根据你的真实感受作答，<span className="font-semibold text-violet-600">没有对错之分</span>，只有不同的色彩。
          作答完成后，你将获得一张专属的「爱情六边形」镭射结果图，以及针对你的个性化数据分析。
        </div>

        <button
          type="button"
          onClick={onStart}
          className="group mx-auto mt-4 flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-500 to-violet-500 px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-violet-200 transition hover:shadow-xl active:scale-95"
        >
          开始测评
          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
