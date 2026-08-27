import { useEffect, useMemo, useState } from 'react';

export interface Dim {
  key: string;
  cn?: string;
  label?: string;
  en: string;
  score: number;
  max: number;
  norm?: number;
  percent: number;
  color: string;
  level?: string;
  levelDesc?: string;
}

interface Props {
  dims: Dim[];
  size?: number;
  showLegend?: boolean;
}

const ANGLES = [-90, -30, 30, 90, 150, 210];

export default function LasHexagon({ dims, size = 340, showLegend = true }: Props) {
  const [animated, setAnimated] = useState(false);
  const r = (size / 340) * 110;
  const cx = size / 2;
  const cy = size / 2;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const point = (i: number, radius: number) => {
    const a = (ANGLES[i] * Math.PI) / 180;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  };

  const ring = (ratio: number) =>
    Array.from({ length: 6 }, (_, i) => point(i, r * ratio).join(',')).join(' ');

  const dataPoints = dims.map((d, i) => {
    const pr = animated ? r * Math.max(0.08, d.norm ?? d.percent / 100) : 0;
    return point(i, pr).join(',');
  }).join(' ');

  const dataPath = useMemo(() => `M ${dataPoints} Z`, [dataPoints]);
  const dataPathLength = useMemo(() => {
    // Approximate perimeter for dash animation
    let len = 0;
    const pts = dims.map((d, i) => {
      const pr = animated ? r * Math.max(0.08, d.norm ?? d.percent / 100) : 0;
      return point(i, pr);
    });
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      len += Math.hypot(x2 - x1, y2 - y1);
    }
    return len || 600;
  }, [animated, dims, r]);

  const labels = dims.map((d, i) => {
    const [lx, ly] = point(i, r + 30);
    return { ...d, x: lx, y: ly };
  });

  const vertexDots = dims.map((d, i) => {
    const pr = animated ? r * Math.max(0.08, d.norm ?? d.percent / 100) : 0;
    const [vx, vy] = point(i, pr);
    return { ...d, x: vx, y: vy };
  });

  const gradientId = 'lasHexFill';
  const strokeGradId = 'lasHexStroke';
  const glowId = 'lasHexGlow';
  const softGlowId = 'lasHexSoftGlow';
  const orbitId = 'lasHexOrbit';

  return (
    <div className="flex w-full flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="las-hex-float h-auto w-full overflow-visible"
        aria-label="爱情六边形"
        style={{ aspectRatio: '1 / 1', maxWidth: size }}
      >
        <defs>
          {/* Fill: warmer, more saturated center-to-edge gradient */}
          <radialGradient id={gradientId} cx="50%" cy="50%" r="65%" fx="50%" fy="40%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.75" />
            <stop offset="25%" stopColor="#F43F5E" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#8B5CF6" stopOpacity="0.45" />
            <stop offset="85%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.15" />
          </radialGradient>

          {/* Stroke gradient: vibrant rainbow along the data polygon */}
          <linearGradient id={strokeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="25%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="75%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          {/* Outer glow filter for the data polygon */}
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feGaussianBlur stdDeviation="10" result="blurStrong" />
            <feMerge>
              <feMergeNode in="blurStrong" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft center glow */}
          <radialGradient id={softGlowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
            <stop offset="40%" stopColor="#8B5CF6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>

          {/* Rotating outer ring gradient */}
          <linearGradient id={orbitId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0" />
            <stop offset="45%" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="55%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Center soft glow — breathing */}
        <circle cx={cx} cy={cy} r={r * 0.55} fill={`url(#${softGlowId})`}>
          <animate attributeName="r" values={`${r * 0.5};${r * 0.62};${r * 0.5}`} dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;1;0.6" dur="4s" repeatCount="indefinite" />
        </circle>

        {/* Background grid rings */}
        {['0.33', '0.66', '1'].map((ratio, idx) => (
          <polygon
            key={ratio}
            points={ring(Number(ratio))}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={idx === 2 ? 1.5 : 1}
            strokeDasharray={idx === 2 ? undefined : '4 4'}
            opacity={0.8}
          />
        ))}

        {/* Rotating outer orbit ring */}
        <g>
          <polygon
            points={ring(1.12)}
            fill="none"
            stroke={`url(#${orbitId})`}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="20s"
              repeatCount="indefinite"
            />
          </polygon>
        </g>

        {/* Data polygon with glow and draw-in animation */}
        <polygon
          points={dataPoints}
          fill={`url(#${gradientId})`}
          stroke={`url(#${strokeGradId})`}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
          strokeDasharray={dataPathLength}
          strokeDashoffset={animated ? 0 : dataPathLength}
          className="las-hex-polygon transition-all duration-1000 ease-out"
        />

        {/* Vertex dots with pulsing halos */}
        {vertexDots.map((v) => (
          <g key={v.key}>
            {/* Outer halo pulse */}
            <circle
              cx={v.x}
              cy={v.y}
              r={12}
              fill={v.color}
              opacity={0.15}
            >
              <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.25;0.05;0.25" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Middle glow */}
            <circle
              cx={v.x}
              cy={v.y}
              r={10}
              fill={v.color}
              opacity={0.22}
              className="animate-pulse transition-all duration-1000 ease-out"
            />
            {/* Core dot */}
            <circle
              cx={v.x}
              cy={v.y}
              r={6}
              fill="white"
              stroke={v.color}
              strokeWidth={3.5}
              className="transition-all duration-1000 ease-out"
            />
          </g>
        ))}

        {/* Labels */}
        {labels.map((l) => (
          <g key={l.key}>
            <rect
              x={l.x - 34}
              y={l.y - 13}
              width={68}
              height={26}
              rx={13}
              fill="white"
              fillOpacity={0.88}
              stroke={l.color}
              strokeOpacity={0.3}
              className="backdrop-blur-sm"
            />
            <text
              x={l.x}
              y={l.y + 4}
              textAnchor="middle"
              className="text-[11px] font-bold"
              fill={l.color}
            >
              {l.cn || l.label || l.key}
            </text>
          </g>
        ))}
      </svg>

      {showLegend && (
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-600 sm:grid-cols-3">
          {dims.map((d) => (
            <div key={d.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.cn || d.label || d.key} {d.en} · {d.score}分</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .las-hex-float {
            animation: las-hex-bob 5s ease-in-out infinite;
          }
        }
        @keyframes las-hex-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
