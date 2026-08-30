import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import SurveyHeader from '../../components/SurveyHeader';

interface Question {
  id: string;
  text: string;
}

interface Props {
  questions: Question[];
  value: Record<string, number>;
  onChange: (id: string, score: number) => void;
  onSubmit: () => void;
  submitting?: boolean;
}

const OPTIONS = [
  { score: 1, label: '非常不同意' },
  { score: 2, label: '不同意' },
  { score: 3, label: '一般' },
  { score: 4, label: '同意' },
  { score: 5, label: '非常同意' },
];

export default function LasQuestion({ questions, value, onChange, onSubmit, submitting }: Props) {
  const [current, setCurrent] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [tip, setTip] = useState<string>('');
  const [tipKind, setTipKind] = useState<'current' | 'missing' | ''>('');

  const q = questions[current];
  const currentVal = value[q.id];
  const progress = ((current + 1) / questions.length) * 100;
  const isFirst = current === 0;
  const isLast = current === questions.length - 1;
  const canGoNext = currentVal !== undefined;
  const canSubmit = questions.every((q) => value[q.id] !== undefined);
  const missingCount = questions.filter((q) => value[q.id] === undefined).length;
  // 第一道未作答题目的下标，用于提示时一键跳转
  const firstMissingIndex = questions.findIndex((q) => value[q.id] === undefined);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [current]);

  const handleSelect = (score: number) => {
    onChange(q.id, score);
    // 先展示选中后的紫色高亮，短暂延迟后再自动跳转下一题
    if (current < questions.length - 1) {
      window.setTimeout(() => {
        setCurrent((c) => Math.min(questions.length - 1, c + 1));
      }, 350);
    }
  };

  const goPrev = () => {
    setCurrent((c) => Math.max(0, c - 1));
  };

  const goNext = () => {
    if (!canGoNext) {
      setShowAlert(true);
      return;
    }
    setCurrent((c) => Math.min(questions.length - 1, c + 1));
  };

  // 一键跳到第一道未作答的题目
  const jumpToMissing = () => {
    if (firstMissingIndex < 0) return;
    setCurrent(firstMissingIndex);
    setTip('');
    setTipKind('');
  };

  const handleSubmit = () => {
    if (submitting) return;
    if (!canSubmit) {
      if (currentVal === undefined) {
        setTip('请先选择本题答案，再提交问卷');
        setTipKind('current');
        setTimeout(() => { setTip(''); setTipKind(''); }, 3000);
      } else if (missingCount > 0) {
        // 保留提示，等用户点击跳转按钮后再清除
        setTip(`还有 ${missingCount} 道题未作答`);
        setTipKind('missing');
      }
      return;
    }
    onSubmit();
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-[#FDF4FF] via-[#F5F3FF] to-[#EEF2FF]">
      <SurveyHeader />
      <div className="border-b border-white/40 bg-white/60 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-xl">
          <div className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
            <img src="/las-icon.svg" alt="" className="h-6 w-6" />
            <span>爱情态度量表</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={goPrev}
              disabled={isFirst}
              className="rounded-full p-2 text-slate-500 hover:bg-white disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                <span>进度 {current + 1}/{questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-500 to-violet-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <button
              onClick={goNext}
              disabled={isLast}
              className="rounded-full p-2 text-slate-500 hover:bg-white disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs leading-relaxed text-slate-400">
              以下条目中的他/她指你目前的恋人；若没有，请以最近一任或想象的对象作答。
            </p>
            <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-600">
              第 {current + 1} 题
            </span>
          </div>

          <h2 className="mb-10 text-center text-xl font-semibold leading-relaxed text-slate-800 sm:text-2xl">
            {q.text}
          </h2>

          <div className="space-y-3">
            {OPTIONS.map((opt) => {
              const active = currentVal === opt.score;
              return (
                <button
                  key={opt.score}
                  onClick={() => handleSelect(opt.score)}
                  className={`group flex w-full items-center rounded-2xl border px-5 py-4 text-left transition ${
                    active
                      ? 'border-violet-300 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md'
                      : 'border-white/60 bg-white/80 text-slate-700 hover:border-violet-200 hover:bg-white'
                  }`}
                >
                  <span
                    className={`mr-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                      active ? 'border-white bg-white/20' : 'border-slate-200 text-slate-400 group-hover:border-violet-300'
                    }`}
                  >
                    {opt.score}
                  </span>
                  <span className="text-base font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex items-center gap-3">
            {!isFirst && (
              <button
                type="button"
                onClick={goPrev}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-6 py-3.5 text-base font-semibold text-slate-600 shadow-sm backdrop-blur-sm transition hover:border-violet-200 hover:bg-white hover:text-violet-600 hover:shadow-md active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
                上一题
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-400 via-fuchsia-500 to-violet-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-200 transition hover:shadow-xl disabled:opacity-60 disabled:shadow-none ${canSubmit && !submitting ? 'animate-pulse' : ''}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    正在生成报告…
                  </>
                ) : (
                  '提交查看爱情六边形'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-200 transition hover:shadow-xl active:scale-95"
              >
                下一题
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {isLast && tip && (
            <div className="mt-3 text-center">
              <p className="text-sm font-medium text-rose-500 animate-pulse">{tip}</p>
              {tipKind === 'missing' && firstMissingIndex >= 0 && (
                <button
                  type="button"
                  onClick={jumpToMissing}
                  className="mx-auto mt-2 flex items-center justify-center gap-1.5 rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-rose-200 transition hover:bg-rose-600 active:scale-95"
                >
                  前往第 {firstMissingIndex + 1} 题补答
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-slate-800">提示</h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">
              请为当前题目选择一个答案，然后再进入下一题。
            </p>
            <button
              type="button"
              onClick={() => setShowAlert(false)}
              className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg active:scale-95"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
