/**
 * 个性化报告生成服务
 * 根据测评类型与结果，从 reportTemplates 模板中合成结构化个性化报告
 */

import { ScoreResult } from './scoring';

export interface ReportTemplate {
  key: string; // 结果类型键，如 ISTJ / D / 红 / 战略 / R
  title: string; // 结果名称，如"物流师型"
  summary: string; // 一句话概览
  overview: string; // 详细解读
  strengths: string[]; // 优势
  growthPoints: string[]; // 成长建议
  careers?: string[]; // 适配方向（可选）
  relationships?: string; // 人际建议（可选）
  advice?: Record<string, string>; // 场景化建议（可选）
}

export interface GeneratedReport {
  resultType: string;
  resultTitle: string;
  summary: string;
  overview: string;
  strengths: string[];
  growthPoints: string[];
  careers?: string[];
  relationships?: string;
  advice?: Record<string, string>;
  dimensionAnalysis: {
    dimension: string;
    label: string;
    score: number;
    max: number;
    percent: number;
  }[];
  totalScore: number;
  maxScore: number;
  disclaimer: string;
  // 亲子测评（qinzi）6 区块扩展
  maxSev?: number; // 0-3
  lieFlag?: number; // 0=可信 / 1=存疑
  severity?: Record<string, number>; // 各维度严重程度
  levels?: Record<string, string>; // 各维度等级标签
  concern?: Record<string, number>; // 各维度关注度百分比
  banner?: { emoji: string; headline: string; sub: string; concernDims: string[] }; // Banner 区块
  narratives?: { dimension: string; label: string; level: string; severity: number; concern: number; desc: string; advantage?: string; improvement?: string }[]; // Narrative 区块
  resilienceNote?: string; // 心理韧性科普
  courses?: { key?: string; title: string; desc: string; reason: string }[]; // Course 区块（课程建议）
  ending?: { quote: string; encourage: string }; // Ending 区块
  // 爱情测评（love）扩展
  triangle?: { dimension: string; label: string; avg: number; percent: number }[]; // 三角三维度
  attachment?: { type: string; title: string; desc: string; suggest: string; avg: { anxious: number; avoidant: number } }; // 依恋风格
  // 爱情态度量表（las）扩展
  las?: {
  primary: { key: string; cn: string; en: string; color: string; tag: string; score: number; core: string; tip: string };
  secondary: { key: string; cn: string; en: string; color: string; tag: string; score: number; core: string; tip?: string };
  low: { key: string; cn: string; en: string; color: string; score: number; tip: string };
  combo: string;
  strength: string;
  balance: { title: string; desc: string; near: boolean; diff: number };
  warns: string[];
  dims: { key: string; cn: string; en: string; color: string; tag: string; score: number; max: number; level: string; levelLabel: string; levelDesc: string; percent: number }[];
  ai?: { letter: string; suggestions: string[] } | null;
  };
  // 爱情三角（lovetri）扩展：斯腾伯格 7 种爱情类型
  loveTri?: {
  type: string; // 类型 key（consummate/romantic/...）
  cn: string; // 通俗爱情称呼（如"至臻之爱"）
  en: string; // 英文理论名
  tag: string; // 一句话标签
  color: string; // 主题色
  emoji: string; // 小人/形象 emoji
  avatarName: string; // 爱情小人名
  desc: string; // 通俗解读
  features: string[]; // 构成要素（亲密/激情/承诺）
  tips: string; // 如何更好去爱
  quote: string; // 专属寄语
  triangle: { dimension: string; label: string; avg: number; max: number; percent: number }[]; // 三角三维均分
  dims: { key: string; cn: string; en: string; color: string; score: number; max: number; level: string; percent: number }[];
  balance: { title: string; desc: string };
  types: {
    key: string; cn: string; en: string; tag: string; emoji: string; avatarName: string; color: string;
    desc: string; tips: string; features: string[]; active: boolean; score: number;
  }[]; // 7 种类型全览，active 标记用户所属
  };
  }

interface AssessmentTemplate {
  code: string;
  templates: Record<string, ReportTemplate>;
}

// 爱情态度量表（LAS）主色×次色组合的爱情优势话术
// 温暖、积极、不重复画像内容，突出该组合在亲密关系中的独特优势
const LAS_STRENGTHS: Record<string, string> = {
  // 主色：浪漫型（Eros）
  eros_ludus:
    '你天生懂得让爱情保持新鲜与趣味。你既能制造心动瞬间，又懂得用轻松游戏的方式让关系不沉闷。你的爱像一场烟花，绚烂又自在。',
  eros_storge:
    '你拥有一颗既浪漫又稳定的心。心动与陪伴在你身上奇妙地共存，你既能点燃激情，也愿意做对方最长久的朋友。',
  eros_pragma:
    '你懂得把浪漫落到实处。你不是只活在梦里的人，你会用心经营一段有未来的关系，让爱既热烈又可靠。',
  eros_mania:
    '你爱得浓烈而真挚，拥有全身心投入的能力。这份深情让你成为愿意为爱燃烧的人，也让对方感受到被强烈珍视。',
  eros_agape:
    '你的浪漫里带着温柔的慷慨。你不仅渴望被爱，更愿意把最好的给予对方，让爱成为双向的温暖流动。',
  // 主色：游戏型（Ludus）
  ludus_eros:
    '你擅长在爱情里创造心跳与惊喜。你的轻松态度让关系没有负担，而你心底的火花，总能点燃彼此的吸引力。',
  ludus_storge:
    '你是最懂得把恋人处成朋友的人。和你在一起很轻松，不需要伪装，这种自在本身就是一种难得的亲密。',
  ludus_pragma:
    '你既清醒又洒脱。你不会让爱冲昏头脑，却也不会让理性把浪漫赶尽杀绝，你懂得在自由与选择之间找到平衡。',
  ludus_mania:
    '你表面云淡风轻，内心却有很深的情感浓度。这让你既神秘又迷人，你的爱像一首藏不住情绪的歌。',
  ludus_agape:
    '你在爱里自由自在，却也藏着温柔的善意。你不会强行占有，却愿意默默付出，让对方在你身旁感到被接纳。',
  // 主色：同伴型（Storge）
  storge_eros:
    '你既能给对方家的安稳，也懂得制造属于两个人的小浪漫。细水长流里，藏着你不经意的心动。',
  storge_ludus:
    '你是关系里的稳定锚点，却也不失趣味。你的陪伴让人安心，而你的幽默感让日子变得轻松可爱。',
  storge_pragma:
    '你是非常踏实的伴侣。你相信时间会说话，也愿意用行动把“永远”变成一件件具体的小事。',
  storge_mania:
    '你对爱的忠诚很深。一旦认定一个人，你就会把对方纳入生命的秩序里，这份笃定是关系最牢固的底气。',
  storge_agape:
    '你的爱像一座温暖的港湾。你不求回报地守护对方，让对方知道：无论世界怎样，你都在。',
  // 主色：现实型（Pragma）
  pragma_eros:
    '你在务实的外表下，藏着一颗愿意为爱热烈跳动的心。一旦选定了人，你会认真地爱，也会认真地计划未来。',
  pragma_ludus:
    '你善于用理性的方式经营爱情，同时保留一份轻松。你不会让爱变成沉重的枷锁，而是让它在合理的空间里自由生长。',
  pragma_storge:
    '你重视承诺，也珍视日常的陪伴。你既有长远的目光，也有愿意日复一日陪伴对方的耐心。',
  pragma_mania:
    '你的爱是经过深思熟虑的深情。你不轻易投入，但一旦投入，那份专注与认真会让对方感到无比珍贵。',
  pragma_agape:
    '你爱得清醒而无私。你会为对方考虑现实与未来，也会默默承担起守护这段关系的责任。',
  // 主色：占有型（Mania）
  mania_eros:
    '你爱得炽烈而浪漫。你愿意为对方翻山越岭，把每一份心意都变成具体的行动，这种全情投入本身就是一份礼物。',
  mania_ludus:
    '你的情感浓度很高，却也有自己独特的节奏。你会让关系保持张力，让对方在追逐与被追逐中感受到你的存在。',
  mania_storge:
    '你渴望深度的依恋，也愿意做最忠实的陪伴者。一旦建立了信任，你会成为对方生命里最不离不弃的人。',
  mania_pragma:
    '你虽然情感强烈，却也有现实的一面。你懂得为爱规划未来，把深刻的感情落地成可以依赖的生活。',
  mania_agape:
    '你的爱是深情与付出的结合。你愿意为对方倾尽所有，这份毫无保留的爱，拥有打动人心的力量。',
  // 主色：奉献型（Agape）
  agape_eros:
    '你的爱既热烈又无私。你会把对方放在心上最重要的位置，也愿意为爱制造浪漫与仪式感。',
  agape_ludus:
    '你在爱里慷慨而自由。你不会用爱绑架对方，而是愿意让对方在你的善意里轻松做自己。',
  agape_storge:
    '你是最温柔的长期主义者。你用日复一日的关怀与陪伴，把爱变成了对方生活里习以为常的温暖。',
  agape_pragma:
    '你的付出不是盲目的，而是踏实的。你会为对方的未来考虑，把关怀落实在具体的生活细节里。',
  agape_mania:
    '你拥有一颗深情又宽厚的心。你愿意包容对方的情绪，也愿意在风雨里紧紧握住对方的手。',
};

// 斯腾伯格爱情三角 7 种爱情类型：通俗称呼 + 爱情小人形象 + 解读
// features 为构成该类型的三角要素（亲密/激情/承诺）
interface LoveTriType {
  key: string;
  cn: string;
  en: string;
  tag: string;
  emoji: string;
  avatarName: string;
  color: string;
  desc: string;
  tips: string;
  quote: string;
  features: string[];
  strengths: string[];
  suggestions: string[];
}
const LOVETRI_TYPES: Record<string, LoveTriType> = {
  consummate: {
    key: 'consummate', cn: '满分式爱情', en: 'Consummate Love', tag: '圆满 · 三昧齐燃', emoji: '✨', avatarName: '满分恋人',
    color: '#f7c948',
    desc: '你是爱情里“最难能可贵”的模样——亲密、激情、承诺三根支柱稳稳撑起你心中的理想之爱。你既能毫无保留地靠近对方，也敢于许下长久的约定，还始终保有让爱持续发光的热情。这不是运气，而是你懂经营、愿投入、肯珍惜的结果。',
    tips: '圆满是持续经营的起点。定期为关系注入新鲜感，也给彼此留一点独立呼吸的空间，爱会更有弹性、更长久。',
    quote: '你的爱，是三个音符谱成的和弦——温柔、热烈、且笃定。',
    features: ['亲密', '激情', '承诺'],
    strengths: [
      '你是爱情里的“全能型选手”——亲密、激情、承诺三根支柱齐备，这是许多人向往的理想状态。',
      '你既懂得敞开心扉分享内心，也敢于许下长久的承诺，还能让爱持续保持温度，经营能力令人欣赏。',
      '你的爱完整而稳定，能给伴侣一种“被稳稳接住”的安心感，这是关系里最珍贵的底气。',
    ],
    suggestions: [
      '圆满也需要“保鲜”。定期为关系制造新鲜感，让美好的相处习惯持续发光。',
      '给彼此留一点独立呼吸的空间，适度的距离会让爱更有弹性和生命力。',
      '允许关系有自然的起伏，偶尔的不完美，反而会让爱更真实、更可爱。',
    ],
  },
  romantic: {
    key: 'romantic', cn: '心动式爱情', en: 'Romantic Love', tag: '怦然 · 浪漫四溢', emoji: '💗', avatarName: '心动甜心',
    color: '#ff4d6d',
    desc: '你是“一眼心动”的浪漫主义者。亲密与激情让你爱得热烈又深情，你会记住每一个值得纪念的瞬间，也会为对方准备不期而遇的惊喜。你的爱像一杯微醺的红酒，甜而不腻，让人忍不住沉溺。',
    tips: '浪漫的心动很珍贵，试着在对未来的憧憬里也加上彼此的身影，让热烈不仅在当下绽放，也能稳稳地延续下去。',
    quote: '你的爱，是一场不会散场的玫瑰色心动。',
    features: ['亲密', '激情'],
    strengths: [
      '你拥有“让人心动”的天赋，浪漫是你的本能，惊喜和仪式感是你的拿手好戏。',
      '你爱得热烈又深情，能让平淡的日子因为你的存在而闪闪发光。',
      '你善于表达爱意，从不吝啬赞美与温柔，和你在一起的人总觉得自己被认真爱着。',
    ],
    suggestions: [
      '在浪漫的心动里，试着和对方聊聊关于未来的想象，让热烈也能落地生根。',
      '把“今天好爱你”变成“我会一直在这里”，用小小的约定为感情增添笃定感。',
      '日常里的陪伴与承诺，是让心动持续发光的温柔底色。',
    ],
  },
  companionate: {
    key: 'companionate', cn: '长情式爱情', en: 'Companionate Love', tag: '相守 · 细水长流', emoji: '🍵', avatarName: '长情暖宝',
    color: '#2ec4b6',
    desc: '你是“细水长流”的陪伴者。亲密与承诺让你愿意把对方请进生命里，一起分享琐碎、一起面对风雨。你的爱不轰轰烈烈，却像一盏始终亮着的灯，让人安心，也让人笃定“原来有人一直都在”。',
    tips: '细水长流的陪伴是一种福气，也记得偶尔制造一点心跳时刻，让熟悉的日子继续升温。',
    quote: '你的爱，是家该有的温度——安稳、温暖、不离不弃。',
    features: ['亲密', '承诺'],
    strengths: [
      '你是关系里最可靠的港湾，细水长流的陪伴，让伴侣随时都有“家”的安心感。',
      '你擅长倾听与守护，懂得在生活的细节里传递温度，让爱渗透进每个平凡日常。',
      '你对承诺的坚守，让爱经得起时间的考验——你的爱人可以放心地依靠你。',
    ],
    suggestions: [
      '长久的陪伴里，也记得为彼此制造一点心动时刻，让熟悉的日子重新升温。',
      '试着把藏在行动里的在乎，用一句走心的情话或一个拥抱表达出来。',
      '和伴侣一起尝试一件新鲜事，稳定的关系也可以拥有新鲜的冒险感。',
    ],
  },
  fatuous: {
    key: 'fatuous', cn: '热恋式爱情', en: 'Fatuous Love', tag: '炽热 · 飞蛾扑火', emoji: '🔥', avatarName: '热恋小火',
    color: '#ff7b00',
    desc: '你是“说走就走”的热烈行动派。激情与承诺让你爱得果断而炽烈，认定一个人就愿意立刻把真心交付。你渴望轰轰烈烈，也会为爱奋不顾身，这股冲劲，是很多人羡慕也做不到的勇气。',
    tips: '炽热与笃定都很珍贵，试着在日常里多分享、多倾听，让承诺扎根在真实的懂得里，爱会燃烧得更稳、更久。',
    quote: '你的爱，是一场奔赴热烈的飞蛾扑火，勇敢而璀璨。',
    features: ['激情', '承诺'],
    strengths: [
      '你有一往无前的爱的勇气，认定一个人就愿意立刻交付真心，这份果断令人羡慕。',
      '你是行动派爱人，说到做到，愿意为关系投入全部热情与精力。',
      '和你在一起，永远不缺少热烈与冲劲，你的爱能把平凡生活点燃成烟火。',
    ],
    suggestions: [
      '在热烈与笃定之间，试着多走进彼此的内心，让“认定”也包含“懂得”。',
      '每天留一点时间分享彼此的心情与日常，亲密会在这些细碎里慢慢生长。',
      '你们的激情与承诺已经是很好的起点，再添上深入的亲密，爱会更圆满。',
    ],
  },
  liking: {
    key: 'liking', cn: '知己式爱情', en: 'Liking', tag: '懂你 · 交心知己', emoji: '☀️', avatarName: '知己暖阳',
    color: '#ffb347',
    desc: '你是“灵魂共鸣”的知己型。亲密让你拥有走进对方内心的能力，你懂ta的欢喜与脆弱，也能毫无负担地坦诚相待。在你这里，爱是先“懂”而后“爱”，这种深刻的默契，珍贵又动人。',
    tips: '你擅长让人被理解，也试着让对方看见你心动的一面。把默契轻轻变成靠近，爱情就有了更温柔的入口。',
    quote: '你的爱，是两颗心相视一笑就能读懂彼此的默契。',
    features: ['亲密'],
    strengths: [
      '你是天生的“灵魂伴侣”，能走进对方内心最柔软的地方，让人被深深理解。',
      '你懂得倾听与共情，和你相处的人总能卸下防备，做真实的自己。',
      '这份纯粹的理解与默契，是很多关系求之不得的珍贵礼物。',
    ],
    suggestions: [
      '你已经是很好的倾听者，试着也让对方看见你心动的一面，靠近会更有温度。',
      '当感情成熟时，不妨和对方聊聊对未来的期待，把默契轻轻变成约定。',
      '给彼此创造一点专属的浪漫时刻，让“懂”升华为“恋”。',
    ],
  },
  infatuated: {
    key: 'infatuated', cn: '火花式爱情', en: 'Infatuated Love', tag: '心动 · 一见倾心', emoji: '🎆', avatarName: '火花精灵',
    color: '#ff5d8f',
    desc: '你是“一见倾心”的激情主导者。你的爱像一场绚烂的烟火，来得快、燃得烈，充满吸引力与生命力。你享受心动瞬间的悸动，也愿意为喜欢的人勇敢表达，这份热忱让平淡的生活瞬间被点亮。',
    tips: '心动的烟火很亮，若能在日常里慢慢扎根，它会成为关系里最温暖的长明灯火。',
    quote: '你的爱，是一瞬间点亮夜空的心动烟火。',
    features: ['激情'],
    strengths: [
      '你的爱像烟火般绚烂，充满不可抗拒的吸引力，让人一见难忘。',
      '你敢于表达心动，敢爱敢追，让关系始终充满电光石火的活力。',
      '你的热情是关系最明亮的开场，和你在一起的人，每一天都可能被惊喜点亮。',
    ],
    suggestions: [
      '心动是很好的开始，试着多走进对方的生活与内心，让热烈有更深的连接。',
      '在约会与惊喜之外，也一起分享日常琐事，亲密往往藏在最平凡的对话里。',
      '当感情稳定时，和对方一起描绘未来的画面，承诺会让激情更有方向感。',
    ],
  },
  empty: {
    key: 'empty', cn: '坚守式爱情', en: 'Empty Love', tag: '承诺 · 责任坚守', emoji: '🛡️', avatarName: '坚守骑士',
    color: '#667eea',
    desc: '你是“一诺千金”的责任型。承诺让你在关系里异常可靠，你会把“在一起”认真当成一种责任来坚守。你不轻易开始，但一旦认定，就会用行动去兑现那句承诺——这种担当，是爱情里最稀缺的稳定力量。',
    tips: '你的担当让人安心，记得也给关系加一点温柔与惊喜，让承诺被爱意包裹着生长。',
    quote: '你的爱，是一句说出口就一定会兑现的承诺。',
    features: ['承诺'],
    strengths: [
      '你是爱情里最稀缺的“稳定力量”，一诺千金、言行一致，让人从骨子里感到踏实。',
      '你把责任稳稳扛在肩上，用日复一日的行动证明，爱不是说说而已。',
      '你的可靠是关系穿越风浪的压舱石，你的爱人可以永远相信你的选择。',
    ],
    suggestions: [
      '你的可靠是珍贵的，试着在责任之外，也主动表达温柔与想念。',
      '每天花一点时间和伴侣分享彼此的一天，让亲密在细小处重新流动。',
      '偶尔制造一个浪漫或轻松的约会，让承诺既有安全感，也有心动感。',
    ],
  },
};

// 三维度元信息（用于 lovetri 报告）
const LOVETRI_DIMS: Record<string, { cn: string; en: string; color: string }> = {
  intimacy: { cn: '亲密', en: 'Intimacy', color: '#ff6b81' },
  passion: { cn: '激情', en: 'Passion', color: '#ff9f1c' },
  commitment: { cn: '承诺', en: 'Commitment', color: '#36a2eb' },
};

function normalizeKey(code: string, resultType: string): string {
  switch (code) {
    case 'disc':
    case 'sbti':
      return resultType.replace(/型$/, '');
    case 'bigfive':
      return resultType.replace(/主导$/, '');
    case 'color':
      return resultType.replace(/色主导$/, '');
    default:
      return resultType;
  }
}

export function generatePersonalReport(
  code: string,
  assessmentName: string,
  result: ScoreResult,
  templatesJson: any,
  respondentName?: string
): GeneratedReport {
  const templates: any = typeof templatesJson === 'string' ? JSON.parse(templatesJson) : templatesJson;
  // 兼容两种模板存储格式：{ templates: {...} } 或 { [key]: template, _dims: ... }
  const templateMap = templates?.templates && Object.keys(templates.templates).length > 0
    ? templates.templates
    : templates;

  const key = normalizeKey(code, result.resultType);

  // 霍兰德：组合前3个字母的描述
  let mainTemplate: ReportTemplate | null = null;
  let hollandParts: ReportTemplate[] = [];
  if (code === 'holland' && result.resultType.length >= 2) {
    hollandParts = result.resultType.split('').map(l => templateMap[l]).filter(Boolean);
    mainTemplate = hollandParts[0] || null;
  } else {
    mainTemplate = templateMap[key] || null;
  }

  // 维度分析
  const labels = result.dimensionLabels || {};
  const dimensionAnalysis = Object.entries(result.dimensionScores).map(([dim, score]) => ({
    dimension: dim,
    label: labels[dim] || dim,
    score,
    max: result.dimensionMax[dim] || 1,
    percent: Math.round((score / (result.dimensionMax[dim] || 1)) * 100),
  }));

  const overview = code === 'holland' && hollandParts.length > 0
    ? `您的霍兰德职业兴趣代码为 **${result.resultType}**。${hollandParts.map(p => `「${p.title}」${p.overview}`).join('')}`
    : mainTemplate?.overview || `您的测评结果为 **${result.resultType}**。该结果基于您的答题情况自动生成。`;

  const report: GeneratedReport = {
    resultType: result.resultType,
    resultTitle: mainTemplate?.title || result.resultType,
    summary: mainTemplate?.summary || '感谢完成本次测评，报告已生成。',
    overview,
    strengths: mainTemplate?.strengths || [],
    growthPoints: mainTemplate?.growthPoints || [],
    careers: mainTemplate?.careers,
    relationships: mainTemplate?.relationships,
    advice: mainTemplate?.advice,
    dimensionAnalysis,
    totalScore: result.totalScore,
    maxScore: result.maxScore,
    disclaimer: `本报告由寻心理测评平台基于"${assessmentName}"答题结果自动生成，仅供参考，不构成专业医疗诊断或心理治疗建议。如您感到持续的心理困扰，请及时寻求专业心理医生的帮助。`,
  };

  // 亲子学业压力沟通测评：拼装 6 区块（Banner / Overview / Radar / Narrative / Course / Ending）
  if (code === 'qinzi' && result.maxSev !== undefined) {
    const qz: Record<string, any> = (templatesJson && (templates?.templates as any)) || {};
    const main = (qz[result.resultType] as any) || {};
    const dimsDef = qz._dims || {};
    const coursesDef = qz._courses || {};
    const labels2 = result.dimensionLabels || {};
    const displayName = respondentName || '朋友';
    const withName = (text?: string) => (text ? text.replace(/\{name\}/g, displayName) : text);

    // 1. Banner：列出需要关注的维度（severity>=2 的维度名）
    const sev = result.severity || {};
    const concernDims = Object.entries(sev)
      .filter(([, s]) => (s as number) >= 2)
      .map(([d]) => labels2[d] || d);
    let bannerSub = withName((main.banner as any)?.sub) || main.summary || '';
    if (concernDims.length > 0) {
      bannerSub += `其中，「${concernDims.join('、')}」方面需要您多一些关注。`;
    }
    report.banner = {
      emoji: (main.banner as any)?.emoji || '💛',
      headline: withName((main.banner as any)?.headline) || result.resultType,
      sub: bannerSub,
      concernDims,
    };

    // 3. Narrative：各维度档位解读
    report.narratives = Object.entries(result.dimensionScores).map(([dim, score]) => {
      const def = dimsDef[dim] || {};
      const lv = (result.levels || {})[dim] || '';
      const levelDef = (def.levels || []).find((l: any) => l.label === lv);
      return {
        dimension: dim,
        label: labels2[dim] || dim,
        level: lv,
        severity: (result.severity || {})[dim] ?? 0,
        concern: (result.concern || {})[dim] ?? 0,
        desc: levelDef?.desc || `您在「${labels2[dim] || dim}」维度得分为 ${score} 分，处于「${lv}」水平。`,
      };
    });
    report.resilienceNote = '什么是心理韧性？心理韧性（Resilience）指孩子在面对压力、挫折与变化时，能够快速调整、坚持努力并从经历中恢复成长的内在能力。它不是天生的"性格标签"，而是可以在日常互动中逐步培养的——家长稳定的情绪、开放的表达和足够的信任，就是孩子心理韧性最好的土壤。';
    report.concern = result.concern || {};

    // 5. Course：severity>=2 推送对应团辅；都健康推 SEL；有弱项时 SEL 作为补充
    const courses: { title: string; desc: string; reason: string }[] = [];
    const weakDims = Object.entries(sev).filter(([, s]) => (s as number) >= 2).map(([d]) => d);
    if (weakDims.length === 0) {
      // 都健康 → 加分项口径 + 统一推荐 SEL
      if (coursesDef.sel) courses.push({ key: 'sel', ...coursesDef.sel, reason: '三方面状态都很健康，继续系统提升孩子的人际与情绪能力。' });
    } else {
      weakDims.forEach(d => {
        if (coursesDef[d]) {
          const reasonMap: Record<string, string> = {
            comm: '亲子沟通达到需要调整的水平，建议通过团辅重建安全对话。',
            anx: '学业焦虑水平偏高，建议先学习管理自己的情绪。',
            res: '孩子心理韧性偏弱，建议通过团辅帮助其提升抗挫能力。',
          };
          courses.push({ key: d, ...coursesDef[d], reason: reasonMap[d] || '该维度需要重点关注。' });
        }
      });
      // 有弱项时，SEL 作为"无论状态如何都建议"的补充项
      if (coursesDef.sel) courses.push({ key: 'sel', ...coursesDef.sel, reason: '无论当前状态如何，都值得长期投入的社会情感学习。' });
    }
    report.courses = courses;

    // 6. Ending
    const ending = main.ending || {
      quote: '最好的教育，藏在好好说话里。',
      encourage: '请记得照顾好自己——你的情绪稳定，就是孩子最好的安全感。',
    };
    report.ending = {
      quote: withName(ending.quote) || '',
      encourage: withName(ending.encourage) || '',
    };
  }

  // 爱情三角测评：拼装三角雷达 + 维度档位 + 依恋风格
  if (code === 'love') {
    const qz: Record<string, any> = templateMap || {};
    const main = (qz[result.resultType] as any) || {};
    const dimsDef = templates?._dims || {};
    const attachDef = templates?._attachment || {};

    // 三维度百分比（平均分 / 5）
    const triDims = ['intimacy', 'passion', 'commitment'];
    const triangle = triDims.map(d => {
      const avg = result.dimensionScores[d] || 0;
      return { dimension: d, label: labels[d] || d, avg, percent: Math.round((avg / 5) * 100) };
    });

    // 维度档位解读
    report.narratives = triDims.map(d => {
      const avg = result.dimensionScores[d] || 0;
      const def = dimsDef[d] || {};
      const levelDef = (def.levels || []).find((l: any) => avg >= l.min);
      return {
        dimension: d,
        label: labels[d] || d,
        level: levelDef?.label || '—',
        severity: 0,
        concern: 0,
        desc: levelDef?.desc || `您在「${labels[d] || d}」维度平均得分为 ${avg} 分。`,
        advantage: levelDef?.advantage || '',
        improvement: levelDef?.improvement || '',
      };
    });
    report.concern = result.concern || {};
    report.triangle = triangle;

    // 依恋风格（深度版）
    if (result.attachment) {
      const at = attachDef[result.attachment] || {};
      report.attachment = {
        type: result.attachment,
        title: at.title || result.attachment,
        desc: at.desc || '',
        suggest: at.suggest || '',
        avg: result.attachmentAvg || { anxious: 0, avoidant: 0 },
      };
    }
  }

  // 爱情态度量表 LAS：六边形数据 + 主次色画像 + 混色解读 + 平衡度 + 盲区 + 特殊提醒
  if (code === 'las') {
    const qz: Record<string, any> = (templatesJson && (templates?.templates as any)) || {};
    const portraits = qz._portraits || {};
    const combos = qz._combos || {};
    const lowtips = qz._lowtips || {};
    const dimsDef = qz._dims || {};
    const balanceDef = qz._balance || {};

    // 六维数据（与 LAS_ORDER 一致：eros/ludus/storge/pragma/mania/agape）
    const dimsMeta: Record<string, { cn: string; en: string; color: string; tag: string }> = {};
    Object.keys(dimsDef).forEach(d => {
      dimsMeta[d] = { cn: dimsDef[d].label.split(' ')[0] || d, en: dimsDef[d].label.split(' ')[1] || d, color: dimsDef[d].color || '#888', tag: dimsDef[d].tag || '' };
    });
    const order = ['eros', 'ludus', 'storge', 'pragma', 'mania', 'agape'];
    const levelTag = (s: number) => (s >= 29 ? '倾向明显' : s >= 22 ? '中等' : '偏低');

    const dims = order.map(d => {
      const score = result.dimensionScores[d] || 0;
      const meta = dimsMeta[d] || { cn: d, en: d, color: '#888', tag: '' };
      const max = result.dimensionMax[d] || 35;
      // 六边形归一化：norm(r) = clamp((r-7)/28, 0.05, 1)
      const norm = Math.max(0.05, Math.min(1, (score - 7) / 28));
      // 按等级取话术（与 _dims.levels 档位一致，报告与话术保持统一）
      const level = levelTag(score);
      const levelDef = (dimsDef[d]?.levels || []).find((l: any) => score >= l.min);
      return {
        key: d, cn: meta.cn, en: meta.en, color: meta.color, tag: meta.tag,
        score, max,
        level,
        levelLabel: `${meta.cn}型`,
        levelDesc: levelDef?.desc || '',
        percent: Math.round(norm * 100),
      };
    });

    const sorted = order.slice().sort((a, b) => (result.dimensionScores[b] || 0) - (result.dimensionScores[a] || 0));
    const p = sorted[0] || 'eros';
    const s = sorted[1] || 'storge';
    const low = sorted[5] || 'agape';
    const sc = (d: string) => result.dimensionScores[d] || 0;
    const metaP = dimsMeta[p] || { cn: '浪漫', en: 'Eros', color: '#ff4d6d', tag: '' };
    const metaS = dimsMeta[s] || { cn: '同伴', en: 'Storge', color: '#2ec4b6', tag: '' };
    const metaLow = dimsMeta[low] || { cn: '奉献', en: 'Agape', color: '#f15bb5', tag: '' };

    // 平衡度
    const diff = sc(p) - sc(low);
    const balTitle = diff <= 3 ? '均衡型 · 六色混色' : diff <= 8 ? '主导型 · 色彩分明' : '聚焦型 · 主色鲜明';
    const near = sc(p) - sc(s) <= 2;

    // 特殊提醒
    const warns: string[] = [];
    if (sc('mania') >= 28) warns.push('占有型需要留意：你在这段关系里很容易焦虑——对方的回应、关注、行踪都会牵动你的情绪。这不是你的错，但值得被温柔对待：试着把一部分注意力放回自己身上，运动、爱好、朋友，让「他/她」不再是你情绪的开关。若焦虑已经严重影响生活，请考虑寻求专业支持。');
    if (sc('agape') >= 28) warns.push('奉献型需要留意：你太习惯把对方放在第一位，甚至用牺牲换取安心。请记得：一段健康的爱，是你不必熄灭自己也能照亮彼此。练习「被爱」，和练习「付出」同样重要。');
    if (sc('ludus') >= 28) warns.push('游戏型需要留意：你享受自由、害怕承诺，这没有对错。但如果你内心深处其实渴望一段认真的关系，请试着让某个对的人，走进你「游戏」的边界之内。');
    if (sc('mania') >= 28 && sc('agape') >= 28) warns.push('特别提醒：「占有」与「奉献」同时偏高，是最容易在爱里透支自我的组合——你一边害怕失去，一边倾尽所有。请优先学会爱自己，再谈爱别人。');
    if ((p === 'mania' && s === 'ludus') || (p === 'ludus' && s === 'mania')) warns.push('拉扯模式：回避与焦虑在你的内心同时存在，让你在亲密关系里忽远忽近。这通常与早期的依恋经验有关，觉察它，就是改变的开始。');

    report.las = {
      primary: {
        key: p, cn: metaP.cn, en: metaP.en, color: metaP.color, tag: metaP.tag, score: sc(p),
        core: portraits[p]?.core || '', tip: portraits[p]?.tip || '',
      },
      secondary: {
        key: s, cn: metaS.cn, en: metaS.en, color: metaS.color, tag: metaS.tag, score: sc(s),
        core: portraits[s]?.core || '', tip: portraits[s]?.tip || '',
      },
      low: { key: low, cn: metaLow.cn, en: metaLow.en, color: metaLow.color, score: sc(low), tip: lowtips[low] || `你的${metaLow.cn || '相对盲区'}得分偏低，代表这种爱的方式目前不是你情感表达的主通道。它并非缺点，只是说明你更容易用其他颜色去爱与被爱。在需要时，也可以有意识地打开这扇窗，让爱情光谱更完整。` },
      combo: combos[`${p}_${s}`] || '',
      strength:
        LAS_STRENGTHS[`${p}_${s}`] ||
        `你的主要爱情优势来自${metaP.cn}与${metaS.cn}的组合：${metaP.cn}让你在亲密关系中充满活力与辨识度，而${metaS.cn}则让你的爱更有层次感。你不需要变成别人，你现在的样子就已经很值得被爱。`,
      balance: { title: balTitle, desc: balanceDef[balTitle]?.desc || '', near, diff },
      warns,
      dims,
      // 固定话术（不调用大模型）：按 主色 × 主色等级 从模板取温暖寄语与建议，覆盖全部颜色×等级组合
      ai: (() => {
        const pLevel = levelTag(sc(p));
        const adv = portraits[p]?.levels?.[pLevel] || {};
        return {
          letter: adv.letter || portraits[p]?.tip || '',
          suggestions: Array.isArray(adv.suggestions) ? adv.suggestions.slice(0, 3) : [],
        };
      })(),
    };
    report.concern = {};
  }

  // 爱情三角（lovetri）：斯腾伯格 7 种爱情类型报告
  if (code === 'lovetri') {
    const typeKey = result.loveTri || lovetriTypeFromResult(result);
    const typeDef = LOVETRI_TYPES[typeKey] || LOVETRI_TYPES.consummate;
    const avg = result.loveTriAvg || { intimacy: 0, passion: 0, commitment: 0 };
    const triKeys = ['intimacy', 'passion', 'commitment'];

    // 三角三维均分
    const triangle = triKeys.map(d => ({
      dimension: d,
      label: LOVETRI_DIMS[d]?.cn || d,
      avg: avg[d] || 0,
      max: 5,
      percent: Math.round(((avg[d] || 0) / 5) * 100),
    }));

    // 三维度数据（带等级）
    const levelOf = (s: number) => (s >= 3.5 ? '充分' : s >= 2.5 ? '中等' : '萌芽');
    const dims = triKeys.map(d => {
      const meta = LOVETRI_DIMS[d] || { cn: d, en: d, color: '#888' };
      const score = avg[d] || 0;
      return {
        key: d, cn: meta.cn, en: meta.en, color: meta.color, score,
        max: 5, level: levelOf(score), percent: Math.round((score / 5) * 100),
      };
    });

    // 三角形态：与 7 种爱情类型的维度数量完全对应，保证前后一致
    const allDimCN = ['亲密', '激情', '承诺'];
    const strongDims = typeDef.features; // 如 ['激情', '承诺']
    const weakDims = allDimCN.filter(d => !strongDims.includes(d));
    let balanceTitle: string, balanceDesc: string;
    if (strongDims.length === 3) {
      balanceTitle = '均衡三角 · 三足鼎立';
      balanceDesc = '你的亲密、激情与承诺三根支柱齐头并进，稳稳撑起一座均衡的“爱之三角”。这是许多人向往的爱情状态，也是你用心经营的结果。';
    } else if (strongDims.length === 2) {
      balanceTitle = '双翼驱动 · 两柱并立';
      balanceDesc = `你的“${strongDims[0]}”与“${strongDims[1]}”两柱并立，共同为这段关系注入能量；而“${weakDims[0]}”相对薄弱。${typeDef.cn}的你爱得${strongDims.includes('激情') ? '热烈' : ''}${strongDims.includes('承诺') ? '笃定' : ''}${strongDims.includes('亲密') ? '温暖' : ''}，补上${weakDims[0]}的一角，三角会更稳固。`;
    } else {
      balanceTitle = '聚焦单维 · 正在蓄力';
      balanceDesc = `你目前的爱情三角以“${strongDims[0]}”为主导，${weakDims.join('、')}相对薄弱。这正是${typeDef.cn}最鲜明的轮廓，也是你爱情里最有辨识度、最有成长空间的一面。`;
    }

    // 优势与建议：直接采用该爱情类型的专属文案（不同类型不同，同类型相同）
    const strengths = typeDef.strengths;
    const suggestions = typeDef.suggestions;

    // 温暖有力量的心理学金句（按三角形态切换）
    const closings: Record<string, string> = {
      balance:
        '斯腾伯格认为，完美的爱是亲密、激情与承诺共同奏响的乐曲。你的三角，正在演奏属于自己的和弦。',
      双翼: '爱不是寻找一个完美的人，而是学会用完美的眼光，欣赏那个并不完美的人。——卡尔·罗杰斯',
      聚焦:
        '好的爱情，不是两个完美的人在一起，而是两个不完美的人，愿意为彼此变得更好。',
    };
    const closing = closings[strongDims.length === 3 ? 'balance' : strongDims.length === 2 ? '双翼' : '聚焦'];

    // 7 种类型全览（含活跃标记与分数）
    const types = Object.values(LOVETRI_TYPES).map(t => ({
      key: t.key, cn: t.cn, en: t.en, tag: t.tag, emoji: t.emoji, avatarName: t.avatarName, color: t.color,
      desc: t.desc, tips: t.tips, features: t.features,
      active: t.key === typeKey,
      score: lovetriScoreFor(t.key, avg),
    }));

    report.loveTri = {
      type: typeKey,
      cn: typeDef.cn,
      en: typeDef.en,
      tag: typeDef.tag,
      color: typeDef.color,
      emoji: typeDef.emoji,
      avatarName: typeDef.avatarName,
      desc: typeDef.desc,
      features: typeDef.features,
      tips: typeDef.tips,
      quote: typeDef.quote,
      triangle,
      dims,
      balance: { title: balanceTitle, desc: balanceDesc },
      types,
      strengths,
      suggestions,
      closing,
    };
  }

  return report;
}

// 兜底：从三维均分推 7 型 key（与 scoring 逻辑一致）
function lovetriTypeFromResult(result: ScoreResult): string {
  const avg = result.loveTriAvg || { intimacy: 0, passion: 0, commitment: 0 };
  const high = (v: number) => v >= 3.5;
  const i = high(avg.intimacy), p = high(avg.passion), c = high(avg.commitment);
  if (i && p && c) return 'consummate';
  if (i && p) return 'romantic';
  if (i && c) return 'companionate';
  if (p && c) return 'fatuous';
  if (i) return 'liking';
  if (p) return 'infatuated';
  if (c) return 'empty';
  const sorted = ['intimacy', 'passion', 'commitment'].sort((a, b) => (avg[b] || 0) - (avg[a] || 0));
  const top = sorted[0] || 'intimacy';
  return top === 'intimacy' ? 'liking' : top === 'passion' ? 'infatuated' : 'empty';
}

// 计算某个类型与用户三维均分的契合度（用于 7 型全览排序展示）
function lovetriScoreFor(typeKey: string, avg: Record<string, number>): number {
  const want: Record<string, boolean> = { intimacy: false, passion: false, commitment: false };
  const typeDef = LOVETRI_TYPES[typeKey];
  typeDef?.features.forEach(f => {
    if (f === '亲密') want.intimacy = true;
    else if (f === '激情') want.passion = true;
    else if (f === '承诺') want.commitment = true;
  });
  let sum = 0, cnt = 0;
  (['intimacy', 'passion', 'commitment']).forEach(d => {
    const s = avg[d] || 0;
    // 需要的要素得分越高越契合，不需要的要素低分不扣分
    if (want[d]) { sum += s; cnt++; }
  });
  return cnt ? Math.round((sum / cnt / 5) * 100) : 0;
}
