import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { getAssessmentIcon, IconRefresh, IconTriangle } from '../components/Icons';
import LasReport from './las/LasReport';
import { useLasFavicon } from './las/useLasFavicon';
import LoveTriReport from './lovetri/LoveTriReport';

interface ReportData {
  responseId: number;
  resultType: string;
  totalScore: number;
  report: {
    resultType: string;
    resultTitle: string;
    summary: string;
    overview: string;
    strengths: string[];
    growthPoints: string[];
    careers?: string[];
    relationships?: string;
    advice?: Record<string, string>;
    dimensionAnalysis: { dimension: string; label: string; score: number; max: number; percent: number }[];
    totalScore: number;
    maxScore: number;
    disclaimer: string;
    // 亲子测评（qinzi）扩展
    maxSev?: number;
    lieFlag?: number;
    severity?: Record<string, number>;
    levels?: Record<string, string>;
    concern?: Record<string, number>;
    banner?: { emoji: string; headline: string; sub: string; concernDims: string[] };
    narratives?: { dimension: string; label: string; level: string; severity: number; concern: number; desc: string; advantage?: string; improvement?: string }[];
    resilienceNote?: string;
    courses?: { key?: string; title: string; desc: string; reason: string }[];
    ending?: { quote: string; encourage: string };
    // 爱情测评（love）扩展
    triangle?: { dimension: string; label: string; avg: number; percent: number }[];
    attachment?: { type: string; title: string; desc: string; suggest: string; avg: { anxious: number; avoidant: number } };
    // 爱情态度量表（las）扩展
    las?: {
      primary: { key: string; cn: string; en: string; color: string; tag: string; score: number; core: string; tip: string };
      secondary: { key: string; cn: string; en: string; color: string; tag: string; score: number; core: string };
      low: { key: string; cn: string; en: string; color: string; score: number; tip: string };
      combo: string;
      strength: string;
      balance: { title: string; desc: string; near: boolean; diff: number };
      warns: string[];
      dims: { key: string; cn: string; en: string; color: string; tag: string; score: number; max: number; level: string; levelLabel: string; levelDesc: string; percent: number }[];
      ai?: { letter: string; suggestions: string[] } | null;
    };
    // 爱情三角（lovetri）扩展
    loveTri?: any;
  };
  assessment: { id: number; code: string; name: string; coverColor: string; icon: string; enablePairMatch?: boolean };
  createdAt: string;
  // love / lovetri 扩展
  mode?: string;
  pairCode?: string;
  isPaid?: boolean;
  shareCode?: string;
  sharedAt?: string;
  partnerResponseId?: number;
  partnerName?: string;
  matchedAt?: string;
}

// 严重程度色板（0=绿 / 1=黄 / 2=橙 / 3=红）
const SEV_COLORS = [
  { bg: '#16a34a', soft: '#dcfce7', label: '良好' },
  { bg: '#ca8a04', soft: '#fef9c3', label: '需留意' },
  { bg: '#ea580c', soft: '#ffedd5', label: '需调整' },
  { bg: '#dc2626', soft: '#fee2e2', label: '需关注' },
];

// 三角雷达图（仅亲子测评用）：三个维度构成三角形
function RadarTriangle({ concern }: { concern: Record<string, number> }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2 + 16;
  const r = 104;
  const labels = ['亲子沟通情况', '学业焦虑', '心理韧性'];
  const keys = ['comm', 'anx', 'res'];
  // 每个维度的专属暖色
  const colors = ['#d97b5f', '#e0a458', '#a8664d'];
  // 顶点坐标（上、右下、左下）
  const angles = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6];
  const pts = angles.map(a => [cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  const valPts = keys.map((k, i) => {
    const v = Math.max(0, Math.min(100, concern[k] ?? 0)) / 100;
    return [cx + r * v * Math.cos(angles[i]), cy + r * v * Math.sin(angles[i])] as [number, number];
  });
  const polygon = valPts.map(p => p.join(',')).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto max-w-[320px]" style={{ aspectRatio: '1 / 1' }}>
      <defs>
        <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0a27e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c4705a" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="radarStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8a06a" />
          <stop offset="100%" stopColor="#b25a42" />
        </linearGradient>
        <filter id="radarGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 网格（内层填充 + 虚线分层 + 外圈实线） */}
      {[0.33, 0.66, 1].map(t => (
        <polygon
          key={t}
          points={pts.map(p => `${cx + (p[0] - cx) * t},${cy + (p[1] - cy) * t}`).join(' ')}
          fill={t === 0.33 ? '#fffdfb' : 'none'}
          stroke={t === 1 ? '#ead9cf' : '#f1e6dd'}
          strokeWidth={t === 1 ? 1.6 : 1.2}
          strokeDasharray={t === 1 ? undefined : '5 5'}
        />
      ))}

      {/* 轴线 + 中心点 */}
      {pts.map((p, i) => (
        <line key={`ax${i}`} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="#f2e5db" strokeWidth="1.2" />
      ))}
      <circle cx={cx} cy={cy} r="3" fill="#d98b73" opacity="0.5" />

      {/* 数据区域（渐变填充 + 描边 + 光晕） */}
      <polygon
        points={polygon}
        fill="url(#radarFill)"
        stroke="url(#radarStroke)"
        strokeWidth="3"
        strokeLinejoin="round"
        filter="url(#radarGlow)"
      />

      {/* 顶点节点 */}
      {valPts.map((p, i) => (
        <g key={`dot${i}`}>
          <circle cx={p[0]} cy={p[1]} r="10" fill={colors[i]} opacity="0.18" />
          <circle cx={p[0]} cy={p[1]} r="6" fill={colors[i]} stroke="#fff" strokeWidth="2.5" />
        </g>
      ))}

      {/* 标签卡片 + 数值 */}
      {pts.map((p, i) => {
        const v = concern[keys[i]] ?? 0;
        const top = i === 0;
        const lx = Math.max(56, Math.min(size - 56, p[0]));
        const ly = p[1] + (top ? -34 : 36);
        return (
          <g key={`label${i}`}>
            <rect
              x={lx - 56}
              y={ly - 27}
              width="112"
              height="54"
              rx="15"
              fill="#ffffff"
              stroke={colors[i]}
              strokeOpacity="0.45"
              strokeWidth="1.2"
            />
            <text x={lx} y={ly - 9} textAnchor="middle" fontSize="11" fill="#8a7469" fontWeight="500">
              {labels[i]}
            </text>
            <text x={lx} y={ly + 14} textAnchor="middle" fontSize="18" fill={colors[i]} fontWeight="800">
              {v}
              <tspan fontSize="10" fontWeight="600"> 关注</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 爱情三角雷达图（love 测评）：亲密/激情/承诺 三维度
function LoveTriangle({ triangle }: { triangle: { dimension: string; label: string; avg: number; percent: number }[] }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2 + 12;
  const r = 104;
  const labels = ['亲密', '激情', '承诺'];
  const keys = ['intimacy', 'passion', 'commitment'];
  const colors = ['#e8738c', '#e0a458', '#b25a8e'];
  const angles = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6];
  const pts = angles.map(a => [cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  const valPts = keys.map((k, i) => {
    const t = triangle.find(x => x.dimension === k);
    const v = Math.max(0, Math.min(100, t?.percent ?? 0)) / 100;
    return [cx + r * v * Math.cos(angles[i]), cy + r * v * Math.sin(angles[i])] as [number, number];
  });
  const polygon = valPts.map(p => p.join(',')).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto max-w-[320px]" style={{ aspectRatio: '1 / 1' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="loveRadarFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef8ea6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c4705a" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="loveRadarStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8738c" />
          <stop offset="100%" stopColor="#a84a70" />
        </linearGradient>
        <filter id="loveRadarGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
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
      <circle cx={cx} cy={cy} r="3" fill="#e8738c" opacity="0.5" />

      <polygon
        points={polygon}
        fill="url(#loveRadarFill)"
        stroke="url(#loveRadarStroke)"
        strokeWidth="3"
        strokeLinejoin="round"
        filter="url(#loveRadarGlow)"
      />

      {valPts.map((p, i) => (
        <g key={`dot${i}`}>
          <circle cx={p[0]} cy={p[1]} r="10" fill={colors[i]} opacity="0.18" />
          <circle cx={p[0]} cy={p[1]} r="6" fill={colors[i]} stroke="#fff" strokeWidth="2.5" />
        </g>
      ))}

      {pts.map((p, i) => {
        const t = triangle.find(x => x.dimension === keys[i]);
        const v = t?.percent ?? 0;
        const top = i === 0;
        const lx = Math.max(56, Math.min(size - 56, p[0]));
        const ly = p[1] + (top ? -34 : 36);
        return (
          <g key={`label${i}`}>
            <rect
              x={lx - 52}
              y={ly - 27}
              width="104"
              height="54"
              rx="15"
              fill="#ffffff"
              stroke={colors[i]}
              strokeOpacity="0.45"
              strokeWidth="1.2"
            />
            <text x={lx} y={ly - 9} textAnchor="middle" fontSize="11" fill="#8a7469" fontWeight="500">
              {labels[i]}
            </text>
            <text x={lx} y={ly + 14} textAnchor="middle" fontSize="18" fill={colors[i]} fontWeight="800">
              {v}
              <tspan fontSize="10" fontWeight="600"> 分</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}


export default function Report() {
  const { responseId } = useParams<{ responseId: string }>();
  const navigate = useNavigate();
  const loveSvgRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // love：配对邀请 & 解锁弹窗
  const [pairLoading, setPairLoading] = useState(false);
  const [pairLink, setPairLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockTab, setUnlockTab] = useState<'code' | 'wechat'>('wechat');
  const [unlockCode, setUnlockCode] = useState('');
  const [unlockMsg, setUnlockMsg] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);

  useEffect(() => {
    api.get(`/responses/${responseId}/report`)
      .then(res => setData(res.data.data))
      .catch(err => setError(getErrorMessage(err, '报告加载失败')))
      .finally(() => setLoading(false));
  }, [responseId]);

  // LAS 报告页使用专属渐变 favicon（必须无条件调用，保证 hooks 数量一致）
  const isLas = !!data && data.assessment.code === 'las';
  useLasFavicon(isLas);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-green-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-amber-50 via-orange-50 to-green-50 px-4">
        <div className="text-5xl">🔍</div>
        <div className="text-text-secondary">{error || '报告不存在或已被删除'}</div>
        <Link to="/" className="btn-primary">返回首页</Link>
      </div>
    );
  }

  const { report, assessment } = data;
  const color = assessment.coverColor;
  const isQinzi = assessment.code === 'qinzi';
  const isLove = assessment.code === 'love';
  const isLoveTri = assessment.code === 'lovetri';

  // 爱情三角（lovetri）：独立炫彩主题报告页
  if (isLoveTri && report.loveTri) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF5F6] via-[#F5F0FF] to-[#EEF4FF] pb-16">
        <header className="border-b border-white/60 bg-white/70 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link to="/" className="flex items-center gap-2">
              <IconTriangle className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-400 to-violet-500 p-2 text-white shadow-md" />
              <span className="text-lg font-bold text-slate-800">爱情三角</span>
            </Link>
            <Link to="/" className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              返回首页
            </Link>
          </div>
        </header>
        <LoveTriReport
          data={{
            loveTri: report.loveTri,
            resultType: report.resultType,
            score: data.totalScore,
          }}
          assessmentCode={assessment.code}
          enablePairMatch={assessment.enablePairMatch ?? false}
          share={{
            responseId: data.responseId,
            pairCode: data.pairCode,
            partnerName: data.partnerName,
            matchedAt: data.matchedAt,
            shareCode: data.shareCode,
          }}
        />
      </div>
    );
  }

  // LAS：独立紫色主题报告页
  if (isLas && report.las) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FDF4FF] via-[#F5F3FF] to-[#EEF2FF] pb-16">
        <header className="border-b border-white/60 bg-white/70 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/las-icon.svg" alt="寻心理" className="h-9 w-9 rounded-xl object-cover" />
              <span className="font-semibold text-text-primary">寻心理测评平台</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link to={`/fill/${assessment.code}`} className="btn-primary px-3.5 py-2 text-sm">
                <IconRefresh size={15} />
                重新测评
              </Link>
            </div>
          </div>
        </header>
        <LasReport
          data={{
            las: report.las,
            resultType: report.resultType,
            levelTag: report.resultTitle,
            score: data.totalScore,
          }}
          assessmentCode={assessment.code}
        />
      </div>
    );
  }

  const loveMode = data.mode || 'free';
  const triangle = report.triangle || [];

  // 各维度严重程度颜色
  const sevColor = (sev: number) => SEV_COLORS[Math.max(0, Math.min(3, sev))];

  // 保存三角卡片为图片（SVG -> canvas -> PNG）
  const saveLoveCard = async () => {
    const svg = loveSvgRef.current?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>(resolve => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = 320 * scale;
    canvas.height = 320 * scale;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.download = '我的爱情三角测评.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
    URL.revokeObjectURL(url);
  };

  // 生成邀请链接（双人配对）
  const generatePairLink = async () => {
    setPairLoading(true);
    try {
      const res = await api.post('/love/pair', { responseId: data.responseId });
      const pairCode = res.data.data.pairCode;
      const link = `${window.location.origin}${res.data.data.inviteLink}`;
      setPairLink(link);
      // 同步配对码，便于直接进入匹配报告页
      setData(prev => (prev ? { ...prev, pairCode } : prev));
    } catch (err) {
      setPairLink('');
      alert(getErrorMessage(err, '生成邀请链接失败'));
    } finally {
      setPairLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pairLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('复制失败，请手动复制链接');
    }
  };

  // 解锁深度版（兑换码 / 模拟微信支付）
  const handleUnlock = async () => {
    setUnlockMsg('');
    setUnlockLoading(true);
    try {
      const payload: Record<string, unknown> = { responseId: data.responseId };
      if (unlockTab === 'code') {
        if (!unlockCode.trim()) {
          setUnlockMsg('请输入兑换码');
          setUnlockLoading(false);
          return;
        }
        payload.code = unlockCode.trim();
      }
      await api.post('/love/unlock', payload);
      setUnlockOpen(false);
      // 解锁成功 → 跳转深度版续答（模式 deep，rid 关联原答卷）
      navigate(`/fill/love?mode=deep&rid=${data.responseId}`);
    } catch (err) {
      setUnlockMsg(getErrorMessage(err, '解锁失败'));
    } finally {
      setUnlockLoading(false);
    }
  };

  // 各维度说明
  const DIM_INFO = [
    { key: 'comm', label: '亲子沟通情况', desc: '亲子沟通的开放性、尊重度与安全感，满分 60' },
    { key: 'anx', label: '学业焦虑', desc: '面对孩子学业时的焦虑水平，满分 60，越低越好' },
    { key: 'res', label: '心理韧性', desc: '孩子面对困难时的适应与恢复能力，满分 50' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-green-50 pb-16">
      {/* 顶部 */}
      <header className="border-b border-white/60 bg-white/70 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/xunxinli-avatar-cream.png" alt="寻心理" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-semibold text-text-primary">寻心理测评平台</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to={`/fill/${assessment.code}`} className="btn-primary px-3.5 py-2 text-sm">
              <IconRefresh size={15} />
              重新测评
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-8">
        {/* 报告封面（love 使用爱情专属配色） */}
        {!isQinzi && (
          <div className="card overflow-hidden">
            <div
              className="h-36"
              style={{
                background: isLove
                  ? 'linear-gradient(135deg, #e8738c, #c4705a, #a84a70)'
                  : isLas
                    ? 'linear-gradient(135deg, #a78bfa, #8b5cf6, #7c3aed)'
                    : `linear-gradient(135deg, ${color}, ${color}bb)`,
              }}
            />
            <div className="-mt-16 px-6 pb-6 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-white shadow-xl" style={{ color: isLove ? '#e8738c' : isLas ? '#8b5cf6' : color }}>
                {getAssessmentIcon(assessment.code, 'h-12 w-12')}
              </div>
              <h1 className="mt-3 text-2xl font-bold text-text-primary">{assessment.name} · 测评报告</h1>
              <p className="mt-1.5 text-sm text-text-muted">
                {new Date(data.createdAt).toLocaleString('zh-CN')} 完成作答
              </p>
            </div>
          </div>
        )}

        {/* love：三角卡片结果页（保存图片 + 双引导） */}
        {isLove && triangle.length === 3 && (
          <>
            <div className="card mt-6 overflow-hidden">
              <div className="bg-gradient-to-r from-[#e8738c] to-[#c4705a] px-6 py-4 text-center">
                <div className="text-sm font-medium text-white/90">您的爱情三角形态</div>
                <div className="mt-1 text-3xl font-bold text-white">{report.resultTitle}</div>
              </div>
              <div className="p-6 text-center">
                <div ref={loveSvgRef}>
                  <LoveTriangle triangle={triangle} />
                </div>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#e8738c]" />
                  <span className="text-xs text-text-muted">亲密</span>
                  <span className="ml-3 h-3 w-3 rounded-full bg-[#e0a458]" />
                  <span className="text-xs text-text-muted">激情</span>
                  <span className="ml-3 h-3 w-3 rounded-full bg-[#b25a8e]" />
                  <span className="text-xs text-text-muted">承诺</span>
                </div>
                <p className="mx-auto mt-4 max-w-xl leading-relaxed text-text-secondary">{report.summary}</p>
                <button
                  className="btn-secondary mt-5"
                  onClick={saveLoveCard}
                >
                  保存我的三角卡片
                </button>
              </div>
            </div>

            {/* 三维度解读 */}
            {report.narratives && report.narratives.length > 0 && (
              <div className="card mt-6 p-6 sm:p-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#e8738c]">
                  <span className="h-4 w-1 rounded-full bg-[#e8738c]" />
                  三大维度的你
                </h2>
                <div className="space-y-4">
                  {report.narratives.map(n => (
                    <div key={n.dimension} className="rounded-xl bg-gradient-to-r from-[#fff5f7] to-white p-4 border border-[#ffe4ec]">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-[#6b3a44]">{n.label}</span>
                        <span className="rounded-full bg-[#fff0f3] px-3 py-1 text-xs font-medium text-[#e8738c]">{n.level}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{n.desc}</p>
                      {n.advantage && (
                        <div className="mt-3 rounded-lg bg-emerald-50/70 px-3 py-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            优势
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-emerald-800">{n.advantage}</p>
                        </div>
                      )}
                      {n.improvement && (
                        <div className="mt-2 rounded-lg bg-amber-50/70 px-3 py-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            需要提升
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-amber-800">{n.improvement}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 依恋风格（深度版专属） */}
            {loveMode === 'deep' && report.attachment && (
              <div className="card mt-6 p-6 sm:p-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#c4705a]">
                  <span className="h-4 w-1 rounded-full bg-[#c4705a]" />
                  你的依恋风格
                </h2>
                <div className="rounded-xl bg-[#fff0f3] p-5">
                  <div className="text-lg font-bold text-[#c4705a]">{report.attachment.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{report.attachment.desc}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>焦虑倾向</span>
                      <span>{report.attachment.avg.anxious.toFixed(1)} / 5</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-[#e8738c]"
                        style={{ width: `${(report.attachment.avg.anxious / 5) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                      <span>回避倾向</span>
                      <span>{report.attachment.avg.avoidant.toFixed(1)} / 5</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-[#b25a8e]"
                        style={{ width: `${(report.attachment.avg.avoidant / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-4 rounded-xl bg-white/70 p-3 text-sm leading-relaxed text-text-secondary">
                    <span className="font-semibold text-[#c4705a]">给您的建议：</span>
                    {report.attachment.suggest}
                  </p>
                </div>
              </div>
            )}

            {/* 双引导：免费版 → 邀请伴侣 + 解锁深度 */}
            {loveMode === 'free' && !data.isPaid && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="card p-5">
                  <div className="text-2xl">💌</div>
                  <div className="mt-2 text-base font-semibold text-text-primary">邀请 TA 一起测</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                    生成专属链接发给伴侣，TA 完成后即可查看你们的匹配报告。
                  </p>
                  {!pairLink ? (
                    <button className="btn-primary mt-4 w-full" onClick={generatePairLink} disabled={pairLoading}>
                      {pairLoading ? '生成中...' : '生成邀请链接'}
                    </button>
                  ) : (
                    <div className="mt-4">
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={pairLink}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-secondary"
                        />
                        <button className="btn-primary shrink-0 px-3 py-2 text-xs" onClick={copyLink}>
                          {copied ? '已复制' : '复制'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-text-muted">把链接发给伴侣，TA 完成测评后自动生成匹配报告。</p>
                      <button
                        className="btn-primary mt-3 w-full"
                        onClick={() => navigate(`/match/${data.pairCode}`)}
                      >
                        查看匹配报告
                      </button>
                    </div>
                  )}
                </div>
                <div className="card border-[#e8738c]/25 p-5">
                  <div className="text-2xl">🔓</div>
                  <div className="mt-2 text-base font-semibold text-text-primary">解锁深度版报告</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                    再答 24 题，解锁依恋风格解读、更完整的爱情形态分析，还有 Lee 六色爱情理论解读。
                  </p>
                  <button className="btn-primary mt-4 w-full" onClick={() => setUnlockOpen(true)}>
                    解锁深度报告 ¥9.9
                  </button>
                </div>
              </div>
            )}

            {/* 免费版已解锁 → 继续深度作答 */}
            {loveMode === 'free' && data.isPaid && (
              <div className="card mt-6 border-[#e8738c]/25 p-5 text-center">
                <div className="text-2xl">🎉</div>
                <div className="mt-2 text-base font-semibold text-text-primary">已解锁深度版报告</div>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  继续完成剩余 24 题，即可生成完整深度报告。
                </p>
                <button
                  className="btn-primary mt-4"
                  onClick={() => navigate(`/fill/love?mode=deep&rid=${data.responseId}`)}
                >
                  继续作答
                </button>
              </div>
            )}

            {/* 深度版完成 → 匹配入口 */}
            {loveMode === 'deep' && (
              <div className="card mt-6 border-[#e8738c]/25 p-5 text-center">
                <div className="text-2xl">💞</div>
                <div className="mt-2 text-base font-semibold text-text-primary">想看你们的匹配度？</div>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  生成邀请链接发给伴侣，TA 完成测评后，即可生成专属于你们的「双人爱情匹配报告」。
                </p>
                {!pairLink ? (
                  <button className="btn-primary mt-4" onClick={generatePairLink} disabled={pairLoading}>
                    {pairLoading ? '生成中...' : '邀请 TA 一起测'}
                  </button>
                ) : (
                  <div className="mx-auto mt-4 max-w-md">
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={pairLink}
                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-secondary"
                      />
                      <button className="btn-primary shrink-0 px-3 py-2 text-xs" onClick={copyLink}>
                        {copied ? '已复制' : '复制'}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">伴侣完成后，双方报告页都会出现「查看匹配报告」入口。</p>
                    {data.pairCode && (
                      <button className="btn-secondary mt-3 w-full" onClick={() => navigate(`/match/${data.pairCode}`)}>
                        查看匹配报告
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 伴侣版 → 等待匹配 / 查看匹配报告 */}
            {loveMode === 'partner' && (
              <div className="card mt-6 border-[#e8738c]/25 p-5 text-center">
                <div className="text-2xl">🤝</div>
                <div className="mt-2 text-base font-semibold text-text-primary">
                  {data.pairCode ? '等待对方完成测评' : '匹配进行中'}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  对方完成测评后，系统将自动生成你们的「双人爱情匹配报告」。
                  {data.pairCode && <span className="mt-1 block text-xs text-text-muted">配对码：{data.pairCode}</span>}
                </p>
                {data.pairCode && (
                  <Link to={`/match/${data.pairCode}`} className="btn-primary mt-4">
                    查看匹配报告
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* 测评结果（非亲子、非 love、非 las） */}
        {!isQinzi && !isLove && !isLas && <div className="card mt-6 p-6 sm:p-8 text-center">
          <div className="text-sm text-text-secondary">您的测评结果</div>
          <div className="mt-2 text-4xl font-bold tracking-wide" style={{ color }}>
            {report.resultTitle}
          </div>
          <div className="mt-2 inline-block rounded-full bg-primary-light px-4 py-1.5 text-sm font-medium text-primary">
            {report.resultType}
          </div>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-text-secondary">{report.summary}</p>
        </div>}

        {/* 亲子测评：步骤 + Banner 区块 */}
        {isQinzi && (
          <>
            <div className="mb-5">
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>步骤 <span className="font-semibold text-primary">3 / 3</span>：您的个人报告</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
              </div>
            </div>
            {report.banner && (
              <div className="card overflow-hidden border-l-4 border-l-[#c4705a] bg-[#fff8f0]">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{report.maxSev && report.maxSev >= 3 ? '💛' : '💛'}</div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-[#c4705a]">{report.banner.headline}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-[#5c4b41]">{report.banner.sub}</p>
                      <p className="mt-3 text-sm italic leading-relaxed text-[#c4705a]">
                        愿意认真了解自己和孩子的状态，本身就是一种了不起的爱。请先照顾好自己，再去照亮孩子。
                      </p>
                    </div>
                  </div>
                  {report.lieFlag === 1 && (
                    <p className="mt-3 text-xs leading-relaxed text-warning">
                      测谎提示：答卷中存在异常作答，结果仅供参考，请客观看待。
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* 亲子测评：维度得分卡 */}
        {isQinzi && report.dimensionAnalysis.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {DIM_INFO.map(d => {
              const dim = report.dimensionAnalysis.find(x => x.dimension === d.key);
              if (!dim) return null;
              const sev = sevColor(report.severity?.[d.key] ?? 0);
              return (
                <div key={d.key} className="card flex flex-col items-center p-5 text-center">
                  <div className="text-sm font-medium text-text-primary">{d.label}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: sev.bg }}>{dim.score}</span>
                    <span className="text-sm text-text-muted">/ {dim.max}</span>
                  </div>
                  <div className="mt-1 text-sm" style={{ color: sev.bg }}>{report.levels?.[d.key]}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* 维度分析（非亲子、非 love、非 las） */}
        {!isQinzi && !isLove && !isLas && report.dimensionAnalysis.length > 0 && (
          <div className="card mt-6 p-6 sm:p-8">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-text-primary">
              <span className="h-4 w-1 rounded-full bg-primary" />
              维度分析
            </h2>
            <div className="space-y-5">
              {report.dimensionAnalysis.map(dim => {
                const sev = isQinzi ? sevColor(report.severity?.[dim.dimension] ?? 0) : null;
                return (
                  <div key={dim.dimension}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-text-primary">
                        {dim.label || dim.dimension}
                        {isQinzi && (
                          <span
                            className="ml-2 rounded-md px-2 py-0.5 text-xs font-medium"
                            style={{ color: sev!.bg, background: sev!.soft }}
                          >
                            {report.levels?.[dim.dimension]}
                          </span>
                        )}
                      </span>
                      <span className="text-text-secondary">
                        {dim.score} / {dim.max}
                        {isQinzi && <span className="ml-2 text-xs text-text-muted">关注度 {report.concern?.[dim.dimension] ?? 0}%</span>}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${isQinzi ? report.concern?.[dim.dimension] ?? 0 : dim.percent}%`,
                          background: `linear-gradient(90deg, ${(sev?.bg ?? color)}88, ${sev?.bg ?? color})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 亲子测评：Radar 区块（三角雷达图 + 关注度） */}
        {isQinzi && report.concern && (
          <div className="card mt-6 p-6 sm:p-8 text-center">
            <h2 className="text-lg font-semibold text-text-primary">关注指数雷达图</h2>
            <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-text-muted">
              越靠外圈，越值得关注。三个维度分别反映您观察到的亲子沟通情况、家长对孩子学业的焦虑水平，以及您认为孩子的心理韧性水平。
            </p>
            <div className="mt-4 flex justify-center">
              <RadarTriangle concern={report.concern} />
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#fff8f0] px-4 py-1.5 text-xs text-text-secondary">
              <span className="h-3 w-3 rounded bg-[#c4705a]/70" />
              关注指数（0=状态好，100=较需关注）
            </div>
          </div>
        )}

        {/* 亲子测评：Narrative 区块（各维度解读 + 心理韧性科普） */}
        {isQinzi && report.narratives && report.narratives.length > 0 && (
          <div className="mt-6 space-y-4">
            {report.narratives.map(n => {
              const sev = sevColor(n.severity);
              return (
                <div key={n.dimension} className="card p-5">
                  <div className="text-base font-semibold" style={{ color: sev.bg }}>
                    {n.label} · {n.level}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">{n.desc}</p>
                </div>
              );
            })}
            {report.resilienceNote && (
              <div className="card p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#c4705a]">
                  <span className="text-base">💡</span>
                  什么是心理韧性？
                </div>
                <p className="text-sm leading-relaxed text-text-secondary">{report.resilienceNote}</p>
              </div>
            )}
          </div>
        )}

        {/* 详细解读 */}
        {!isQinzi && !isLove && !isLas && <div className="card mt-6 p-6 sm:p-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
            <span className="h-4 w-1 rounded-full bg-primary" />
            结果解读
          </h2>
          <p className="leading-relaxed text-text-secondary">{report.overview}</p>
        </div>}

        {/* 优势 */}
        {!isQinzi && !isLove && !isLas && report.strengths.length > 0 && (
          <div className="card mt-6 p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-success">
              <span className="h-4 w-1 rounded-full bg-success" />
              你的优势
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl bg-success/10 px-4 py-3 text-sm text-text-primary">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-xs text-white">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 成长建议 */}
        {!isQinzi && !isLove && !isLas && report.growthPoints.length > 0 && (
          <div className="card mt-6 p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-warning">
              <span className="h-4 w-1 rounded-full bg-warning" />
              成长建议
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {report.growthPoints.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl bg-warning/10 px-4 py-3 text-sm text-text-primary">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning text-xs text-white">💡</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 适配方向 */}
        {!isQinzi && !isLove && !isLas && report.careers && report.careers.length > 0 && (
          <div className="card mt-6 p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
              <span className="h-4 w-1 rounded-full bg-primary" />
              适配方向
            </h2>
            <div className="flex flex-wrap gap-2">
              {report.careers.map((c, i) => (
                <span key={i} className="rounded-full border border-primary/20 bg-primary-light px-4 py-1.5 text-sm text-primary">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 亲子测评：Course 区块（给您的建议） */}
        {isQinzi && report.courses && report.courses.length > 0 && (
          <div className="card mt-6 p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#c4705a]">
              <span className="text-lg">🌱</span>
              给您的建议
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-text-secondary">
              根据您的情况，以下几类团辅课程可能会比较有帮助：
            </p>
            <ul className="space-y-3">
              {report.courses
                .filter(c => c.key !== 'sel')
                .map((c, idx) => {
                  const num = ['①', '②', '③'][idx] || `${idx + 1}.`;
                  if (c.key === 'anx') {
                    return (
                      <li key={c.key} className="rounded-2xl border border-[#f0dcd2] bg-[#fff8f0] p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c4705a] text-xs font-bold text-white">{num}</span>
                          <span className="text-sm leading-relaxed text-text-secondary">
                            <strong className="font-bold text-[#b25a42]">关于学业焦虑：</strong>
                            建议家长参加<strong className="font-bold text-[#c4705a]">情绪调节主题的家长团辅</strong>，学习把期待调回合理区间、把松弛感带回家；同时，也可以让孩子参加<strong className="font-bold text-[#c4705a]">考前压力缓解、考后心理调节</strong>等相关团辅课程，帮助他更从容地面对学业挑战。
                          </span>
                        </div>
                      </li>
                    );
                  }
                  if (c.key === 'comm') {
                    return (
                      <li key={c.key} className="rounded-2xl border border-[#f0dcd2] bg-[#fff8f0] p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c4705a] text-xs font-bold text-white">{num}</span>
                          <span className="text-sm leading-relaxed text-text-secondary">
                            <strong className="font-bold text-[#b25a42]">关于亲子沟通：</strong>
                            建议参加<strong className="font-bold text-[#c4705a]">亲子沟通主题的家长团辅</strong>，学习更有效的倾听与回应方式，重新走近孩子的内心，让彼此的对话更轻松、更有连接。
                          </span>
                        </div>
                      </li>
                    );
                  }
                  if (c.key === 'res') {
                    return (
                      <li key={c.key} className="rounded-2xl border border-[#f0dcd2] bg-[#fff8f0] p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c4705a] text-xs font-bold text-white">{num}</span>
                          <span className="text-sm leading-relaxed text-text-secondary">
                            <strong className="font-bold text-[#b25a42]">关于心理韧性：</strong>
                            建议参加<strong className="font-bold text-[#c4705a]">儿童心理韧性主题团辅</strong>，通过结构化活动帮助孩子提升适应变化、应对困难与情绪恢复的能力。
                          </span>
                        </div>
                      </li>
                    );
                  }
                  return null;
                })}
              {report.courses.some(c => c.key === 'sel') && (
                <li className="rounded-2xl border border-[#f0dcd2] bg-[#fff8f0] p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e0a458] text-xs font-bold text-white">✦</span>
                    <span className="text-sm leading-relaxed text-text-secondary">
                      <strong className="font-bold text-[#b25a42]">此外：</strong>
                      无论当前状态如何，都建议让孩子参加<strong className="font-bold text-[#c4705a]">儿童社会情感学习（SEL）</strong>主题的团辅课程，<strong className="font-bold text-[#c4705a]">持续提升心理韧性、人际交往能力与情绪调节能力</strong>，让他更健康、更善于表达。
                    </span>
                  </div>
                </li>
              )}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              大量的实证研究结果显示，系统的心理团辅课程能够帮助家长降低焦虑、提升儿童青少年的心理韧性水平，让家长和孩子沟通更顺畅、彼此更理解；同时，也能帮助孩子在面对困难时更从容、更有方法，增强情绪调节能力和问题解决能力，对其长期发展起到积极的保护作用。
            </p>
            <p className="mt-3 rounded-xl bg-[#fff8f0] p-3 text-sm leading-relaxed text-text-secondary">
              如果您愿意，可以联系项目团队报名参加后续的心理团辅活动。<strong className="font-bold text-[#c4705a]">您不必一个人面对，我们一起来为孩子的成长营造更有支持性的环境。</strong>
            </p>
          </div>
        )}

        {/* 沟通建议（非亲子、非 love、非 las） */}
        {!isQinzi && !isLove && !isLas && report.advice && Object.keys(report.advice).length > 0 && (
          <div className="card mt-6 p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-info">
              <span className="h-4 w-1 rounded-full bg-info" />
              沟通锦囊
            </h2>
            <div className="grid gap-3">
              {Object.entries(report.advice).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2.5 rounded-xl bg-info/10 px-4 py-3 text-sm text-text-primary">
                  <span className="mt-0.5 shrink-0 text-info">✦</span>
                  <span className="leading-relaxed">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 人际建议 */}
        {!isQinzi && !isLove && !isLas && report.relationships && (
          <div className="card mt-6 p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-info">
              <span className="h-4 w-1 rounded-full bg-info" />
              相处之道
            </h2>
            <p className="leading-relaxed text-text-secondary">{report.relationships}</p>
          </div>
        )}

        {/* 亲子测评：Ending 区块（金句收尾） */}
        {isQinzi && report.ending && (
          <div className="card mt-6 border border-[#c4705a]/15 bg-[#fff8f0] p-6 text-center sm:p-8">
            <div className="text-lg font-semibold leading-relaxed text-[#c4705a]">
              “{report.ending.quote}”
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{report.ending.encourage}</p>
          </div>
        )}

        {/* 声明 */}
        <div className="card mt-6 bg-background p-5">
          <p className="text-xs leading-relaxed text-text-muted">{report.disclaimer}</p>
        </div>

        {/* 底部操作 */}
        <div className="mt-8 flex justify-center gap-3 print:hidden">
          <Link to="/" className="btn-secondary">
            更多测评
          </Link>
          <Link to={`/fill/${assessment.code}`} className="btn-primary">
            再测一次
          </Link>
        </div>
      </main>

      {/* love：解锁深度版弹窗（兑换码 / 微信支付） */}
      {unlockOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => { if (!unlockLoading) setUnlockOpen(false); }}
        >
          <div
            className="w-full max-w-md animate-[fadeIn_.25s_ease] rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">解锁深度版报告</h3>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-background"
                onClick={() => { if (!unlockLoading) setUnlockOpen(false); }}
              >
                ✕
              </button>
            </div>

            {/* 权益说明 */}
            <div className="mt-4 rounded-xl bg-[#fff0f3] p-4 text-sm leading-relaxed text-[#6b3a44]">
              解锁后将继续完成 <span className="font-semibold text-[#c4705a]">24 道深度题</span>，即可获得：
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>完整爱情三角雷达图与形态深度解读</li>
                <li>依恋风格识别（焦虑 / 回避倾向）</li>
                <li>Lee 六色爱情理论解读与相处建议</li>
              </ul>
            </div>

            {/* 支付方式切换 */}
            <div className="mt-4 flex rounded-xl bg-background p-1">
              {(['wechat', 'code'] as const).map(tab => (
                <button
                  key={tab}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    unlockTab === tab ? 'bg-white text-primary shadow-sm' : 'text-text-muted'
                  }`}
                  onClick={() => { setUnlockTab(tab); setUnlockMsg(''); }}
                >
                  {tab === 'wechat' ? '微信支付 ¥9.9' : '兑换码'}
                </button>
              ))}
            </div>

            {unlockTab === 'wechat' ? (
              <div className="mt-4 rounded-xl border border-border p-4 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-[#e8f5e9] text-[#4caf50]">
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
                    <path d="M8.5 4C4.9 4 2 6.4 2 9.4c0 1.7 1 3.2 2.5 4.2l-.6 2.1 2.4-1.2c.7.2 1.4.3 2.2.3 3.6 0 6.5-2.4 6.5-5.4S12.1 4 8.5 4zM6.3 7.4c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zm4.4 0c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zM15.5 9.6c-2.6 0-4.7 1.8-4.7 4.1s2.1 4.1 4.7 4.1c.6 0 1.2-.1 1.7-.2l1.7.9-.4-1.5c1.3-.8 2.2-2 2.2-3.3 0-2.3-2.1-4.1-4.7-4.1zm-1 2.6c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7zm2.1 0c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7z" />
                  </svg>
                </div>
                <div className="mt-2 text-sm font-medium text-text-primary">微信支付 ¥9.9</div>
                <p className="mt-1 text-xs text-text-muted">当前为演示环境，点击即模拟支付成功</p>
                <button className="btn-primary mt-3 w-full py-2.5" onClick={handleUnlock} disabled={unlockLoading}>
                  {unlockLoading ? '支付中...' : '立即支付'}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <input
                  value={unlockCode}
                  onChange={e => setUnlockCode(e.target.value)}
                  placeholder="请输入兑换码"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <button className="btn-primary mt-3 w-full py-2.5" onClick={handleUnlock} disabled={unlockLoading}>
                  {unlockLoading ? '兑换中...' : '兑换解锁'}
                </button>
              </div>
            )}

            {unlockMsg && <p className="mt-3 text-sm text-danger">{unlockMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
