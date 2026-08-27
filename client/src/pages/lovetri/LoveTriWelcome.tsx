import { useEffect } from 'react';
import { Heart, Sparkles, Triangle } from 'lucide-react';
import SurveyHeader from '../../components/SurveyHeader';

interface Props {
  onStart: () => void;
}

export default function LoveTriWelcome({ onStart }: Props) {
  // 进入开始页时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-[#fff5f7] via-[#ffe8ed] to-[#fff0f3]">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-rose-300/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-pink-300/15 blur-3xl" />
      </div>

      <SurveyHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-10 pt-8">
        {/* 顶部标题区 */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-violet-500 shadow-lg shadow-rose-200/60">
            <Triangle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
            爱情三角测评
          </h1>
          <p className="mt-2 text-sm font-medium text-rose-500">
            看清你的亲密 · 激情 · 承诺
          </p>
        </div>

        {/* 问卷说明卡片 */}
        <div className="mt-7 rounded-3xl bg-white/80 p-6 shadow-xl shadow-rose-100/60 ring-1 ring-white/70 backdrop-blur-sm sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-violet-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            问卷说明
          </div>

          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              美国心理学家斯滕伯格（Sternberg）提出的爱情三角理论认为，亲密、激情与承诺是爱情中的三大核心成分。它们的高低组合，构成了每个人不同的爱情形态。
            </p>
            <p>
              <span className="font-semibold text-rose-500">想了解你的爱情形态是什么吗？</span>
              爱情三角测评共 12 题，快速了解你的爱情三角，完成之后你将获得：
            </p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-3 rounded-xl bg-rose-50/70 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-400 text-[10px] font-bold text-white">1</span>
                <span className="font-medium text-slate-700">您的专属爱情三角雷达图</span>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-violet-50/70 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">2</span>
                <span className="font-medium text-slate-700">当前爱情形态识别与解读</span>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-pink-50/70 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">3</span>
                <span className="font-medium text-slate-700">你的专属分享海报</span>
              </li>
            </ul>
          </div>

          <div className="mt-5 rounded-2xl border border-rose-100 bg-white/60 p-4 text-sm leading-6 text-slate-500">
            本次作答完全自愿，您的所有信息将严格保密，仅用于研究与服务优化，
            <span className="font-semibold text-rose-500">不作为医学诊断依据</span>
            。请根据真实感受选择最符合的选项。点击“开始作答”即表示您已知晓并同意上述说明。
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={onStart}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-rose-400 via-pink-500 to-violet-500 py-4 text-base font-bold text-white shadow-lg shadow-rose-200/70 transition-all hover:shadow-xl hover:shadow-rose-300/50 active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Heart className="h-5 w-5 transition-transform group-hover:scale-110" />
              开始作答
            </span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">预计 2-3 分钟完成</p>
        </div>
      </div>
    </div>
  );
}
