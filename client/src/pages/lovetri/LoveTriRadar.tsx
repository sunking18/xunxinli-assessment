interface TriDim {
  dimension: string;
  label: string;
  percent: number;
}

interface Props {
  triangle: TriDim[];
  size?: number;
  theme?: 'light' | 'dark';
  showPercent?: boolean;
}

export default function LoveTriRadar({ triangle, size = 300, theme = 'light', showPercent = true }: Props) {
  const isDark = theme === 'dark';
  const colors = ['#ff6b81', '#ff9f1c', '#36a2eb']; // 亲密/激情/承诺
  const order = ['intimacy', 'passion', 'commitment'];

  const byDim: Record<string, number> = {};
  triangle.forEach(t => { byDim[t.dimension] = t.percent; });

  // 紧凑布局：等边三角形贴边，标签紧贴顶点，无多余空白
  const side = size * 0.72; // 三角边长
  const h = side * Math.sqrt(3) / 2; // 三角形高
  const labelPad = size * 0.05; // 标签与顶点间距
  const labelH = size * 0.07; // 标签文字预留高度
  const vbW = size;
  const vbH = h + labelPad * 2 + labelH * 2;
  const cx = vbW / 2;
  const topY = labelPad + labelH;
  const bottomY = topY + h;

  // 三个顶点：亲密(上)、激情(右下)、承诺(左下)
  const pts: [number, number][] = [
    [cx, topY],
    [cx + side / 2, bottomY],
    [cx - side / 2, bottomY],
  ];

  // 三角形重心
  const centroid: [number, number] = [cx, topY + (2 * h) / 3];

  // 用户数值点（从重心向各顶点插值）
  const valPts = pts.map(p => {
    const v = Math.max(0, Math.min(100, byDim[order[0]] ?? 0)) / 100;
    return [
      centroid[0] + (p[0] - centroid[0]) * v,
      centroid[1] + (p[1] - centroid[1]) * v,
    ] as [number, number];
  });
  // 注意：上面只用了 order[0]，需要按索引取
  const valPtsFixed = pts.map((p, i) => {
    const v = Math.max(0, Math.min(100, byDim[order[i]] ?? 0)) / 100;
    return [
      centroid[0] + (p[0] - centroid[0]) * v,
      centroid[1] + (p[1] - centroid[1]) * v,
    ] as [number, number];
  });
  const polygon = valPtsFixed.map(p => p.join(',')).join(' ');

  const gridStroke = isDark ? 'rgba(255,255,255,0.18)' : '#e7d9ee';
  const axisStroke = isDark ? 'rgba(255,255,255,0.25)' : '#f1e6f4';
  const innerFill = isDark ? 'rgba(255,255,255,0.06)' : '#fffdfd';
  const labelColor = isDark ? '#ffffff' : colors;

  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: size }}>
      <svg className="block h-auto w-full" viewBox={`0 0 ${vbW} ${vbH}`}>
        <defs>
          <linearGradient id={`lovetriFill-${theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4d6d" stopOpacity={isDark ? 0.55 : 0.42} />
            <stop offset="100%" stopColor="#7c5cff" stopOpacity={isDark ? 0.22 : 0.1} />
          </linearGradient>
          <linearGradient id={`lovetriStroke-${theme}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff4d6d" />
            <stop offset="50%" stopColor="#7c5cff" />
            <stop offset="100%" stopColor="#36a2eb" />
          </linearGradient>
          <filter id={`lovetriGlow-${theme}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={isDark ? 6 : 4} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* 网格三层 */}
        {[0.33, 0.66, 1].map(t => (
          <polygon
            key={t}
            points={pts.map(p => `${centroid[0] + (p[0] - centroid[0]) * t},${centroid[1] + (p[1] - centroid[1]) * t}`).join(' ')}
            fill={t === 0.33 ? innerFill : 'none'}
            stroke={gridStroke}
            strokeWidth={t === 1 ? 1.5 : 1}
            strokeDasharray={t === 1 ? undefined : '5 5'}
          />
        ))}
        {pts.map((p, i) => (
          <line key={`ax${i}`} x1={centroid[0]} y1={centroid[1]} x2={p[0]} y2={p[1]} stroke={axisStroke} strokeWidth="1.2" />
        ))}
        <circle cx={centroid[0]} cy={centroid[1]} r="3" fill="#7c5cff" opacity={isDark ? 0.7 : 0.45} />

        <polygon
          points={polygon}
          fill={`url(#lovetriFill-${theme})`}
          stroke={`url(#lovetriStroke-${theme})`}
          strokeWidth="3"
          strokeLinejoin="round"
          filter={`url(#lovetriGlow-${theme})`}
        />

        {valPtsFixed.map((p, i) => (
          <g key={`dot${i}`}>
            <circle cx={p[0]} cy={p[1]} r={size * 0.037} fill={colors[i]} opacity="0.16" />
            <circle cx={p[0]} cy={p[1]} r={size * 0.022} fill={colors[i]} stroke="#fff" strokeWidth="2.5" />
          </g>
        ))}

        {/* 顶点标签：紧贴三角形，无额外留白 */}
        {order.map((k, i) => {
          const p = pts[i];
          const t = triangle.find(x => x.dimension === k);
          const label = t?.label || k;
          const pct = Math.round(t?.percent || 0);
          const fontSize = size * 0.043;
          const text = `${label}${showPercent ? ` ${pct}%` : ''}`;
          if (i === 0) {
            return (
              <text
                key={`lbl${i}`}
                x={p[0]}
                y={p[1] - labelPad}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight="700"
                fill={Array.isArray(labelColor) ? labelColor[i] : labelColor}
                style={{ textShadow: isDark ? '0 1px 8px rgba(0,0,0,0.6)' : 'none' }}
              >
                {text}
              </text>
            );
          }
          return (
            <text
              key={`lbl${i}`}
              x={p[0]}
              y={p[1] + labelPad + fontSize * 0.8}
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight="700"
              fill={Array.isArray(labelColor) ? labelColor[i] : labelColor}
              style={{ textShadow: isDark ? '0 1px 8px rgba(0,0,0,0.6)' : 'none' }}
            >
              {text}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
