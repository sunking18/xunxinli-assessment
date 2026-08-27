import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SurveyHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur-md">
      <Link
        to="/"
        className="flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ChevronLeft className="h-5 w-5" />
        返回
      </Link>
      <div className="flex items-center gap-2">
        <img
          src="/xunxinli-avatar-cream.png"
          alt="寻心理"
          className="h-7 w-7 rounded-lg object-cover"
        />
        <span className="text-sm font-semibold text-slate-800">寻心理测评平台</span>
      </div>
      <div className="w-10" />
    </header>
  );
}
