/**
 * 测评计分服务
 * 根据测评类型（code）计算各维度得分与结果类型
 */

export interface Question {
  id: string;
  type: string; // radio / scale / text
  title: string;
  dimension?: string;
  required?: boolean;
  reverse?: boolean; // 反向计分题（亲子沟通第 4/8/9 题）
  lie?: boolean; // 效度题（测谎项，不计分）
  options?: { value: string; label: string }[];
  scaleConfig?: { min?: number; max?: number; minLabel?: string; maxLabel?: string; type?: string };
}

export interface QinziDimensionResult {
  severity: number; // 0=绿 / 1=黄 / 2=橙 / 3=红
  level: string; // 等级标签
  concern: number; // 关注度百分比 0-100
}

export interface ScoreResult {
  totalScore: number;
  resultType: string;
  score: Record<string, number>; // 逐题原始分
  dimensionScores: Record<string, number>; // 各维度得分
  dimensionMax: Record<string, number>; // 各维度满分
  dimensionLabels?: Record<string, string>; // 各维度中文标签
  maxScore: number; // 总分满分
  // 亲子测评（qinzi）扩展字段
  severity?: Record<string, number>; // 各维度严重程度 0-3
  levels?: Record<string, string>; // 各维度等级标签
  concern?: Record<string, number>; // 各维度关注度百分比
  maxSev?: number; // 报告总严重程度（三者的最大值）
  lieFlag?: number; // 效度题作答标记：0=可信 / 1=存疑
  // 爱情测评（love）扩展字段
  attachment?: string; // 依恋风格（深度版）
  attachmentAvg?: { anxious: number; avoidant: number }; // 焦虑/回避均分
  // 爱情态度量表（las）扩展字段
  lasPrimary?: string; // 主色维度 key（如 eros）
  lasSecondary?: string; // 次色维度 key
  lasLow?: string; // 最低分维度 key（相对盲区）
  // 爱情三角（lovetri）扩展字段：斯腾伯格 7 种爱情类型
  loveTri?: string; // 7 种爱情类型 key（如 consummate）
  loveTriAvg?: { intimacy: number; passion: number; commitment: number }; // 三维均分
}

function getRawScore(answers: Record<string, string>, questions: Question[]): Record<string, number> {
  const score: Record<string, number> = {};
  questions.forEach(q => {
    const val = parseFloat(answers[q.id] as any) || 0;
    score[q.id] = val;
  });
  return score;
}

function sumDimensions(answers: Record<string, string>, questions: Question[]): Record<string, number> {
  const dims: Record<string, number> = {};
  questions.forEach(q => {
    if (!q.dimension) return;
    const val = parseFloat(answers[q.id] as any) || 0;
    dims[q.dimension] = (dims[q.dimension] || 0) + val;
  });
  return dims;
}

function questionMax(q: Question): number {
  if (q.type === 'radio' && Array.isArray(q.options) && q.options.length > 0) {
    return Math.max(...q.options.map(o => Number(o.value) || 0), 0);
  }
  if (q.type === 'scale' && q.scaleConfig) {
    return q.scaleConfig.max || 5;
  }
  return 1;
}

const DIMENSION_LABELS: Record<string, Record<string, string>> = {
  mbti: { EI: '能量来源', SN: '信息获取', TF: '决策方式', JP: '生活方式' },
  disc: { D: '支配', I: '影响', S: '稳健', C: '谨慎' },
  bigfive: { O: '开放性', C: '尽责性', E: '外向性', A: '宜人性', N: '神经质' },
  color: { '红': '红色', '蓝': '蓝色', '黄': '黄色', '绿': '绿色' },
  sbti: { '战略': '战略型', '平衡': '平衡型', '团队': '团队型', '创新': '创新型' },
  holland: { R: '现实型', I: '研究型', A: '艺术型', S: '社会型', E: '企业型', C: '常规型' },
  qinzi: { comm: '亲子沟通情况', anx: '学业焦虑', res: '心理韧性' },
  love: { intimacy: '亲密', passion: '激情', commitment: '承诺', attachment: '依恋风格' },
  lovetri: { intimacy: '亲密', passion: '激情', commitment: '承诺' },
  las: { eros: '浪漫型', ludus: '游戏型', storge: '同伴型', pragma: '现实型', mania: '占有型', agape: '奉献型' },
};

// LAS 六维中文名与顺序（主次色判定用）
const LAS_ORDER = ['eros', 'ludus', 'storge', 'pragma', 'mania', 'agape'];
const LAS_DIM_CN: Record<string, string> = {
  eros: '浪漫型', ludus: '游戏型', storge: '同伴型', pragma: '现实型', mania: '占有型', agape: '奉献型',
};

// 依恋维度：附件题目拆分为 焦虑(前3题) / 回避(后3题)
const ATTACHMENT_ANXIOUS_IDS = ['love_a_1', 'love_a_2', 'love_a_3'];
const ATTACHMENT_AVOIDANT_IDS = ['love_a_4', 'love_a_5', 'love_a_6'];

function loveTypeByAvg(avg: Record<string, number>): string {
  const { intimacy = 0, passion = 0, commitment = 0 } = avg;
  // 等级划分：高 >= 4.0，低 < 2.5，其余为中等
  const high = (v: number) => v >= 4.0;
  const low = (v: number) => v < 2.5;

  const iHigh = high(intimacy), iLow = low(intimacy);
  const pHigh = high(passion), pLow = low(passion);
  const cHigh = high(commitment), cLow = low(commitment);

  // 三维度均高：圆满之爱
  if (iHigh && pHigh && cHigh) return '圆满之爱';

  // 两高一低
  if (iHigh && pHigh && cLow) return '浪漫依恋型';
  if (iHigh && cHigh && pLow) return '温暖守护型';
  if (pHigh && cHigh && iLow) return '承诺热情型';

  // 一高两低
  if (iHigh && pLow && cLow) return '灵魂知己型';
  if (pHigh && iLow && cLow) return '心动追逐型';
  if (cHigh && iLow && pLow) return '责任坚守型';

  // 三维度均低
  if (iLow && pLow && cLow) return '情感疏离型';

  // 所有维度都处于中等（2.5-4.0）
  if (!iHigh && !iLow && !pHigh && !pLow && !cHigh && !cLow) return '细水长流型';

  // 其他混合组合：按最高维度决定
  if (intimacy >= passion && intimacy >= commitment) return '亲密倾向型';
  if (passion >= intimacy && passion >= commitment) return '激情倾向型';
  return '承诺倾向型';
}

function loveAttachmentType(anxiousAvg: number, avoidantAvg: number): string {
  if (anxiousAvg >= 3.2 && avoidantAvg >= 3.2) return '恐惧型依恋';
  if (anxiousAvg >= 3.2) return '焦虑型依恋';
  if (avoidantAvg >= 3.2) return '回避型依恋';
  return '安全型';
}

// 斯腾伯格爱情三角 7 种爱情类型映射（按 亲密/激情/承诺 高低组合）
// 高 = 均分 >= 3.5，其余视为未构成该要素
function lovetriTypeByAvg(avg: Record<string, number>): string {
  const { intimacy = 0, passion = 0, commitment = 0 } = avg;
  const high = (v: number) => v >= 3.5;
  const iHigh = high(intimacy), pHigh = high(passion), cHigh = high(commitment);

  // 三维齐全 → 至臻之爱（圆满）
  if (iHigh && pHigh && cHigh) return 'consummate';
  // 两两组合
  if (iHigh && pHigh) return 'romantic';      // 亲密+激情 → 醉爱（浪漫之爱）
  if (iHigh && cHigh) return 'companionate';  // 亲密+承诺 → 暖伴（伴侣之爱）
  if (pHigh && cHigh) return 'fatuous';       // 激情+承诺 → 痴狂（愚昧之爱）
  // 单一维度
  if (iHigh) return 'liking';                 // 亲密 → 知己（喜欢之爱）
  if (pHigh) return 'infatuated';             // 激情 → 燃恋（迷恋之爱）
  if (cHigh) return 'empty';                  // 承诺 → 执子（空洞之爱）

  // 无任何高维度：取最高维度作为主导，映射到对应类型并弱化（萌芽态）
  const sorted = ['intimacy', 'passion', 'commitment'].sort(
    (a, b) => (avg[b] || 0) - (avg[a] || 0)
  );
  const top = sorted[0] || 'intimacy';
  return top === 'intimacy' ? 'liking' : top === 'passion' ? 'infatuated' : 'empty';
}

export function computeAssessmentScore(
  code: string,
  answers: Record<string, string>,
  questions: Question[]
): ScoreResult {
  const rawScore = getRawScore(answers, questions);
  const defaultTotal = Object.values(rawScore).reduce((a, b) => a + b, 0);

  // 维度得分与满分
  const dimensionScores = sumDimensions(answers, questions);
  const dimensionMax: Record<string, number> = {};
  questions.forEach(q => {
    if (q.dimension) {
      dimensionMax[q.dimension] = (dimensionMax[q.dimension] || 0) + questionMax(q);
    }
  });

  let maxScore = questions.reduce((sum, q) => sum + questionMax(q), 0);
  const dimensionLabels = DIMENSION_LABELS[code];

  let resultType = '未知';
  let qinziExtra: Partial<ScoreResult> | null = null;

  switch (code) {
    case 'mbti': {
      const dims = ['EI', 'SN', 'TF', 'JP'];
      const firstLetters = ['E', 'S', 'T', 'J'];
      const secondLetters = ['I', 'N', 'F', 'P'];
      let type = '';
      dims.forEach((dim, i) => {
        const first = questions.filter(q => q.dimension === dim && answers[q.id] === '0').length;
        const second = questions.filter(q => q.dimension === dim && answers[q.id] === '1').length;
        type += first >= second ? firstLetters[i] : secondLetters[i];
      });
      resultType = type;
      break;
    }
    case 'disc': {
      const sorted = Object.entries(dimensionScores).sort((a, b) => b[1] - a[1]);
      resultType = `${sorted[0]?.[0] || 'D'}型`;
      break;
    }
    case 'bigfive': {
      const sorted = Object.entries(dimensionScores).sort((a, b) => b[1] - a[1]);
      resultType = `${sorted[0]?.[0] || 'O'}主导`;
      break;
    }
    case 'color': {
      const sorted = Object.entries(dimensionScores).sort((a, b) => b[1] - a[1]);
      resultType = `${sorted[0]?.[0] || '红'}色主导`;
      break;
    }
    case 'sbti': {
      const sorted = Object.entries(dimensionScores).sort((a, b) => b[1] - a[1]);
      resultType = `${sorted[0]?.[0] || '战略'}型`;
      break;
    }
    case 'holland': {
      const sorted = Object.entries(dimensionScores).sort((a, b) => b[1] - a[1]);
      resultType = sorted.slice(0, 3).map(([d]) => d).join('');
      break;
    }
    case 'qinzi': {
      // 亲子学业压力沟通测评：comm（越高越好）/ anx（越高越差）/ res（越高越好）
      const dimMax: Record<string, number> = { comm: 60, anx: 60, res: 50 };
      const dimScores: Record<string, number> = { comm: 0, anx: 0, res: 0 };
      let lieFlag = 0;
      questions.forEach(q => {
        if (q.lie) {
          // 效度题：期望作答 5（非常符合），不计入任何维度
          if (parseFloat(answers[q.id] as any) !== 5) lieFlag = 1;
          return;
        }
        if (!q.dimension || !(q.dimension in dimScores)) return;
        let v = parseFloat(answers[q.id] as any) || 0;
        if (q.reverse) v = 6 - v; // 反向题反转
        dimScores[q.dimension] += v;
      });

      // 等级与严重程度
      const levelOf = (dim: string, total: number): { level: string; severity: number } => {
        if (dim === 'comm') {
          if (total >= 45) return { level: '优秀', severity: 0 };
          if (total >= 37) return { level: '良好', severity: 1 };
          if (total >= 32) return { level: '一般', severity: 2 };
          return { level: '不容乐观', severity: 3 };
        }
        if (dim === 'anx') {
          if (total <= 27) return { level: '不怎么焦虑', severity: 0 };
          if (total <= 35) return { level: '一般', severity: 1 };
          if (total <= 43) return { level: '较强', severity: 2 };
          return { level: '很强', severity: 3 };
        }
        // res
        if (total >= 38) return { level: '较高', severity: 0 };
        if (total >= 30) return { level: '良好', severity: 1 };
        if (total >= 23) return { level: '一般', severity: 2 };
        return { level: '较弱', severity: 3 };
      };

      const concernOf = (dim: string, total: number): number => {
        const min = dim === 'res' ? 10 : 12;
        const max = dimMax[dim];
        // 越高越好（comm/res）：(max - total) / (max - min) × 100；越高越差（anx）：(total - min) / (max - min) × 100
        const higherBetter = dim !== 'anx';
        const raw = higherBetter
          ? ((max - total) / (max - min)) * 100
          : ((total - min) / (max - min)) * 100;
        return Math.round(Math.max(0, Math.min(100, raw)));
      };

      const severity: Record<string, number> = {};
      const levels: Record<string, string> = {};
      const concern: Record<string, number> = {};
      let maxSev = 0;
      Object.keys(dimScores).forEach(dim => {
        const total = dimScores[dim];
        const { level, severity: sev } = levelOf(dim, total);
        severity[dim] = sev;
        levels[dim] = level;
        concern[dim] = concernOf(dim, total);
        maxSev = Math.max(maxSev, sev);
      });

      resultType = maxSev === 0 ? '温暖同行型' : maxSev === 1 ? '积极改善型' : maxSev === 2 ? '需要调整型' : '需要关注型';

      // 覆盖维度分数与满分（剔除效度题）
      Object.keys(dimScores).forEach(d => {
        dimensionScores[d] = dimScores[d];
        dimensionMax[d] = dimMax[d];
      });
      maxScore = 170;

      qinziExtra = { severity, levels, concern, maxSev, lieFlag };
      break;
    }
    case 'love': {
      // 爱情三角测评：三维度平均分（1-5）+ 依恋风格（深度版）
      const triDims = ['intimacy', 'passion', 'commitment'];
      const avg: Record<string, number> = {};
      const sums: Record<string, number> = {};
      const counts: Record<string, number> = {};
      let anxiousSum = 0, anxiousCnt = 0, avoidantSum = 0, avoidantCnt = 0;
      questions.forEach(q => {
        if (q.lie) return;
        const raw = answers[q.id];
        const v = parseFloat(raw as any);
        if (raw === undefined || raw === '' || isNaN(v)) return; // 未作答不计入
        if (triDims.includes(q.dimension || '')) {
          sums[q.dimension!] = (sums[q.dimension!] || 0) + v;
          counts[q.dimension!] = (counts[q.dimension!] || 0) + 1;
        } else if (q.dimension === 'attachment') {
          if (ATTACHMENT_ANXIOUS_IDS.includes(q.id)) { anxiousSum += v; anxiousCnt += 1; }
          else if (ATTACHMENT_AVOIDANT_IDS.includes(q.id)) { avoidantSum += v; avoidantCnt += 1; }
        }
      });
      triDims.forEach(d => {
        avg[d] = counts[d] ? sums[d] / counts[d] : 0;
        // 维度得分用平均分，满分 5
        dimensionScores[d] = Math.round(avg[d] * 100) / 100;
        dimensionMax[d] = 5;
      });

      const anxiousAvg = anxiousCnt ? anxiousSum / anxiousCnt : 0;
      const avoidantAvg = avoidantCnt ? avoidantSum / avoidantCnt : 0;
      resultType = loveTypeByAvg(avg);
      // 依恋风格（深度版才有值）
      const attachmentType = (anxiousCnt > 0 || avoidantCnt > 0)
        ? loveAttachmentType(anxiousAvg, avoidantAvg)
        : '';
      qinziExtra = {
        severity: {},
        levels: {},
        concern: {},
        maxSev: 0,
        attachment: attachmentType,
        attachmentAvg: { anxious: Math.round(anxiousAvg * 100) / 100, avoidant: Math.round(avoidantAvg * 100) / 100 },
      } as any;
      break;
    }
    case 'lovetri': {
      // 爱情三角（斯腾伯格 7 型）：三维均分（1-5）+ 类型判定
      const triDims = ['intimacy', 'passion', 'commitment'];
      const avg: Record<string, number> = {};
      const sums: Record<string, number> = {};
      const counts: Record<string, number> = {};
      questions.forEach(q => {
        if (q.lie) return;
        const raw = answers[q.id];
        const v = parseFloat(raw as any);
        if (raw === undefined || raw === '' || isNaN(v)) return;
        if (triDims.includes(q.dimension || '')) {
          sums[q.dimension!] = (sums[q.dimension!] || 0) + v;
          counts[q.dimension!] = (counts[q.dimension!] || 0) + 1;
        }
      });
      triDims.forEach(d => {
        avg[d] = counts[d] ? sums[d] / counts[d] : 0;
        dimensionScores[d] = Math.round(avg[d] * 100) / 100;
        dimensionMax[d] = 5;
      });
      const type = lovetriTypeByAvg(avg);
      // 与 loveTypeByAvg 的中文 resultType 保持一致（lovetri 使用 7 型中文名）
      const LOVE_TRI_CN: Record<string, string> = {
        consummate: '满分式爱情',
        romantic: '心动式爱情',
        companionate: '长情式爱情',
        fatuous: '热恋式爱情',
        liking: '知己式爱情',
        infatuated: '火花式爱情',
        empty: '坚守式爱情',
      };
      resultType = LOVE_TRI_CN[type] || '至臻之爱';
      qinziExtra = {
        severity: {},
        levels: {},
        concern: {},
        maxSev: 0,
        loveTri: type,
        loveTriAvg: {
          intimacy: Math.round(avg.intimacy * 100) / 100,
          passion: Math.round(avg.passion * 100) / 100,
          commitment: Math.round(avg.commitment * 100) / 100,
        },
      } as any;
      break;
    }
    case 'las': {
      // 爱情态度量表 LAS：六维总分（各 7-35），主色=最高分维度、次色=第二高分
      const sc: Record<string, number> = {};
      LAS_ORDER.forEach(d => { sc[d] = dimensionScores[d] || 0; });
      const sorted = LAS_ORDER.slice().sort((a, b) => sc[b] - sc[a]);
      const primary = sorted[0] || 'eros';
      // 主色中文名作为 resultType（如"浪漫型"），并保留二级/最低分用于报告
      resultType = LAS_DIM_CN[primary] || '浪漫型';
      qinziExtra = {
        severity: {},
        levels: {},
        concern: {},
        maxSev: 0,
        lasPrimary: primary,
        lasSecondary: sorted[1] || 'storge',
        lasLow: sorted[5] || 'agape',
      } as any;
      break;
    }
    default: {
      resultType = '测评完成';
      break;
    }
  }

  const result: ScoreResult = {
    totalScore: defaultTotal,
    resultType,
    score: rawScore,
    dimensionScores,
    dimensionMax,
    dimensionLabels,
    maxScore,
  };
  if (qinziExtra) Object.assign(result, qinziExtra);
  return result;
}
