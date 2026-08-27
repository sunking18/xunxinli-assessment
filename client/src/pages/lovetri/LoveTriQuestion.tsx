import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Loader2, Triangle } from 'lucide-react';
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
  { score: 1, label: '非常不同意', shape: 'heart', color: '#fb7185' },
  { score: 2, label: '不同意', shape: 'heart', color: '#fb7185' },
  { score: 3, label: '一般', shape: 'heart', color: '#fb7185' },
  { score: 4, label: '同意', shape: 'heart', color: '#fb7185' },
  { score: 5, label: '非常同意', shape: 'heart', color: '#fb7185' },
];

// 不同选项的形状图标
function ShapeIcon({ shape, active }: { shape: string; active: boolean }) {
  const color = active ? '#fff' : '#fb7185';
  switch (shape) {
    case 'circle':
      return <svg viewBox="0 0 24 24" className="h-6 w-6" fill={color}><circle cx="12" cy="12" r="9" /></svg>;
    case 'heart':
      return <svg viewBox="0 0 24 24" className="h-6 w-6" fill={color}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>;
    case 'star':
      return <svg viewBox="0 0 24 24" className="h-6 w-6" fill={color}><path d="m12 2 2.9 6.62L22 9.9l-5.45 5.07L17.8 21 12 17.27 6.2 21l1.25-6.03L2 9.9l7.1-1.28Z" /></svg>;
    case 'diamond':
      return <svg viewBox="0 0 24 24" className="h-6 w-6" fill={color}><path d="M12 2 22 12 12 22 2 12Z" /></svg>;
    case 'flower':
      return <svg viewBox="0 0 24 24" className="h-6 w-6" fill={color}><path d="M12 2c1.1 2.6 3.5 4.1 6 4.9-2.5.8-4.9 2.3-6 4.9-1.1-2.6-3.5-4.1-6-4.9 2.5-.8 4.9-2.3 6-4.9Z" /><circle cx="12" cy="12" r="2.5" fill="#fff" /><path d="M2 12c2.6-1.1 4.1-3.5 4.9-6 .8 2.5 2.3 4.9 4.9 6-2.6 1.1-4.1 3.5-4.9 6-.8-2.5-2.3-4.9-4.9-6Z" /><path d="M22 12c-2.6 1.1-4.1 3.5-4.9 6-.8-2.5-2.3-4.9-4.9-6 2.6-1.1 4.1-3.5 4.9-6 .8 2.5 2.3 4.9 4.9 6Z" /><path d="M12 22c-1.1-2.6-3.5-4.1-6-4.9 2.5-.8 4.9-2.3 6-4.9 1.1 2.6 3.5 4.1 6 4.9-2.5.8-4.9 2.3-6 4.9Z" /></svg>;
    default:
      return null;
  }
}

// 单颗爱心泡泡
interface Bubble {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
}

export default function LoveTriQuestion({ questions, value, onChange, onSubmit, submitting }: Props) {
  const [current, setCurrent] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [tip, setTip] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubbleIdRef = useRef(0);

  const q = questions[current];
  const currentVal = value[q.id];
  const progress = ((current + 1) / questions.length) * 100;
  const isFirst = current === 0;
  const isLast = current === questions.length - 1;
  const canGoNext = currentVal !== undefined;
  const canSubmit = questions.every((qq) => value[qq.id] !== undefined);
  const missingCount = questions.filter((qq) => value[qq.id] === undefined).length;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [current]);

  const spawnHearts = () => {
    const newBubbles: Bubble[] = [];
    for (let i = 0; i < 8; i++) {
      newBubbles.push({
        id: ++bubbleIdRef.current,
        left: 10 + Math.random() * 80,
        size: 12 + Math.random() * 18,
        delay: Math.random() * 0.4,
        duration: 1 + Math.random() * 0.6,
      });
    }
    setBubbles(prev => [...prev, ...newBubbles]);
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => !newBubbles.find(nb => nb.id === b.id)));
    }, 2200);
  };

  const handleSelect = (score: number) => {
    onChange(q.id, score);
    spawnHearts();
    if (current < questions.length - 1) {
      window.setTimeout(() => {
        setCurrent((c) => Math.min(questions.length - 1, c + 1));
      }, 450);
    }
  };

  const goPrev = () => setCurrent((c) => Math.max(0, c - 1));
  const goNext = () => {
    if (!canGoNext) { setShowAlert(true); return; }
    setCurrent((c) => Math.min(questions.length - 1, c + 1));
  };

  const handleSubmit = () => {
    if (submitting) return;
    if (!canSubmit) {
      if (currentVal === undefined) setTip('请先选择本题答案，再提交问卷');
      else if (missingCount > 0) setTip(`还有 ${missingCount} 道题未作答，请返回补答后再提交`);
      setTimeout(() => setTip(''), 3000);
      return;
    }
    onSubmit();
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-[#fff5f7] via-[#ffe8ed] to-[#fff0f3]">
      {/* 爱心泡泡层 */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {bubbles.map(b => (
          <div
            key={b.id}
            className="absolute bottom-0 animate-heart-bubble"
            style={{
              left: `${b.left}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            }}
          >
            <svg viewBox="0 0 24 24" fill="#fb7185" opacity="0.75">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
        ))}
      </div>

      <SurveyHeader />

      <div className="border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-xl">
          <div className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
            <Triangle className="h-5 w-5 text-rose-500" />
            <span>爱情三角</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goPrev} disabled={isFirst} className="rounded-full p-2 text-slate-500 hover:bg-white disabled:opacity-30">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                <span>进度 {current + 1}/{questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-rose-100/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-violet-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <button onClick={goNext} disabled={isLast} className="rounded-full p-2 text-slate-500 hover:bg-white disabled:opacity-30">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
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
                  className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${
                    active
                      ? 'border-rose-300 bg-gradient-to-r from-rose-400 via-pink-500 to-violet-500 text-white shadow-lg shadow-rose-200/70'
                      : 'border-white/60 bg-white/80 text-slate-700 hover:border-rose-200 hover:bg-white hover:shadow-md'
                  }`}
                >
                  {active && <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />}
                  <span
                    className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold transition ${
                      active ? 'border-white/50 bg-white/20' : 'border-slate-200 bg-white text-slate-400 group-hover:border-rose-300'
                    }`}
                    style={active ? {} : {}}
                  >
                    <ShapeIcon shape={opt.shape} active={active} />
                  </span>
                  <span className="relative z-10 flex-1 text-base font-semibold">{opt.label}</span>
                  <span className={`relative z-10 text-xs ${active ? 'text-white/80' : 'text-slate-300'}`}>{opt.score}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex items-center gap-3">
            {!isFirst && (
              <button
                type="button"
                onClick={goPrev}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white/80 px-6 py-3.5 text-base font-semibold text-slate-600 shadow-sm backdrop-blur-sm transition hover:border-rose-300 hover:bg-white hover:text-rose-500 hover:shadow-md active:scale-95"
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
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-400 via-pink-500 to-violet-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-200 transition hover:shadow-xl disabled:opacity-60 disabled:shadow-none ${canSubmit && !submitting ? 'animate-pulse-soft' : ''}`}
              >
                {submitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" />正在生成报告…</>
                ) : (
                  <>
                    提交查看爱情三角
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-200 transition hover:shadow-xl active:scale-95"
              >
                下一题
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {isLast && tip && (
            <p className="mt-3 text-center text-sm font-medium text-rose-500 animate-pulse">{tip}</p>
          )}
        </div>
      </div>

      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-slate-800">提示</h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">请为当前题目选择一个答案，然后再进入下一题。</p>
            <button
              type="button"
              onClick={() => setShowAlert(false)}
              className="w-full rounded-xl bg-gradient-to-r from-rose-400 to-pink-500 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg active:scale-95"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes heart-bubble {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-110vh) scale(1.1); opacity: 0; }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-heart-bubble { animation-name: heart-bubble; animation-timing-function: ease-out; animation-fill-mode: both; }
        .animate-shimmer { animation: shimmer 1.2s infinite; }
        .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
      `}      </style>
    </div>
  );
}

