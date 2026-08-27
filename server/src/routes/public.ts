import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { computeAssessmentScore } from '../services/scoring';
import { generatePersonalReport } from '../services/reportService';
import { authenticate, AuthRequest } from '../middleware/auth';

export const publicRouter = Router();

// 生成双人配对码
function genPairCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// 安全解析 JSON 字符串字段（SQLite 下 questions/dimensions/reportTemplates/answers/score/report 均以字符串存储）
function parseJson<T>(value: any): T {
  if (value == null) return (Array.isArray(value) ? [] : {}) as T;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return (Array.isArray(value) ? [] : {}) as T;
  }
}

// 对象转字符串存储（SQLite String 字段）；undefined 保持 undefined 以触发 Prisma 默认值
function jsonOrUndefined(value: any): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

// 生成订单号
function genOrderNo(): string {
  return `LX${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
}

// 规范化 IP 展示：
//  - ::1 / 0:0:0:0:0:0:0:1  -> 127.0.0.1（IPv6 回环）
//  - ::ffff:127.0.0.1       -> 127.0.0.1（IPv4-mapped IPv6）
//  - 去掉 IPv6 zone 后缀（如 fe80::1%en0）
//  - 其他 IPv4/IPv6 原样保留
function normalizeIp(ip: string | null): string | null {
  if (!ip) return null;
  let v = ip.trim();
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  v = v.replace(/%.*$/, '');
  if (v === '::1' || v === '0:0:0:0:0:0:0:1') return '127.0.0.1';
  const v4 = v.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) return v4[1];
  return v || null;
}

// 获取真实客户端 IP：优先解析 X-Forwarded-For（代理/负载均衡场景），再取 X-Real-IP，最后回退 req.ip
function getClientIp(req: any): string | null {
  let raw: string | null = null;
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    const first = xff.split(',')[0].trim();
    if (first) raw = first;
  }
  if (!raw) {
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) raw = realIp.trim();
  }
  if (!raw) raw = req.ip || null;
  return normalizeIp(raw);
}

// 公开测评列表（已测人数按实际 Response 数量实时统计）
publicRouter.get('/assessments', async (req, res) => {
  const assessments = await prisma.assessment.findMany({
    where: { status: 'published' },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      description: true,
      coverColor: true,
      icon: true,
      questions: true,
      createdAt: true,
    },
  });
  // 已测人数：有登录 userId 的按 userId 去重，匿名答卷按条计
  const allResponses = await prisma.response.findMany({
    select: { assessmentId: true, userId: true },
  });
  const seen = new Map<number, Set<number | string>>();
  for (const r of allResponses) {
    const k = r.userId ?? `anon-${r.assessmentId}-${seen.size}`;
    if (!seen.has(r.assessmentId)) seen.set(r.assessmentId, new Set());
    seen.get(r.assessmentId)!.add(k);
  }
  const data = assessments.map(a => {
    const parsedQuestions = parseJson<any[]>(a.questions);
    return {
      ...a,
      questionCount: Array.isArray(parsedQuestions) ? parsedQuestions.length : 0,
      fillCount: seen.get(a.id)?.size || 0,
    };
  });
  res.json({ data });
});

// 公开测评详情（按 code）
publicRouter.get('/assessments/:code', async (req, res) => {
  const assessment = await prisma.assessment.findUnique({
    where: { code: req.params.code },
  });
  if (!assessment || assessment.status !== 'published') {
    return res.status(404).json({ message: '测评不存在或未发布' });
  }
  const responses = await prisma.response.findMany({
    where: { assessmentId: assessment.id },
    select: { id: true, userId: true },
  });
  // 已测人数：有登录 userId 的按 userId 去重，匿名答卷按条计
  const fillCount = new Set(responses.map(r => r.userId ?? `anon-${r.id}`)).size;
  res.json({
    data: {
      id: assessment.id,
      code: assessment.code,
      name: assessment.name,
      category: assessment.category,
      description: assessment.description,
      instructions: assessment.instructions,
      coverColor: assessment.coverColor,
      icon: assessment.icon,
      questions: parseJson<any[]>(assessment.questions),
      dimensions: parseJson<any[]>(assessment.dimensions),
      enablePairMatch: assessment.enablePairMatch,
      fillCount,
    },
  });
});

// 提交答卷：计分 + 生成个性化报告 + 落库（需要登录）
// love 测评支持 mode：free=免费版(12题) / deep=深度版(36题) / partner=伴侣版(12题)
// 双人匹配：pairCode 关联两份答卷；深度版续答：rid 复用免费版已答 12 题
publicRouter.post('/assessments/:code/respond', authenticate, async (req: AuthRequest, res) => {
  const { answers, duration, respondentName, wechatInfo, respondentInfo, mode, pairCode, rid } = req.body;

  const assessment = await prisma.assessment.findUnique({ where: { code: req.params.code } });
  if (!assessment || assessment.status !== 'published') {
    return res.status(404).json({ message: '测评不存在或未发布' });
  }

  const questions = parseJson<any[]>(assessment.questions);
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ message: '缺少答卷数据' });
  }

  const isLove = assessment.code === 'love';
  const loveMode = isLove ? (mode === 'deep' || mode === 'partner' ? mode : 'free') : undefined;

  // love 深度版续答：先读取原答卷合并答案，再校验与计分
  let prevResponse: any = null;
  if (isLove && loveMode === 'deep' && rid) {
    prevResponse = await prisma.response.findUnique({ where: { id: Number(rid) } });
    if (!prevResponse) return res.status(404).json({ message: '原答卷不存在，请重新作答' });
  }
  const prevAnswers = prevResponse ? parseJson<any>(prevResponse.answers) : {};
  const mergedAnswers = prevResponse ? { ...prevAnswers, ...answers } : answers;

  // 校验必答题：love 免费版/伴侣版只校验 free 题；深度版校验全部（含依恋 deepOnly 题）
  const targetQs = isLove && loveMode !== 'deep'
    ? questions.filter(q => q.free)
    : questions.filter(q => !q.lie);
  const missing = targetQs
    .filter(q => q.required && (mergedAnswers[q.id] === undefined || mergedAnswers[q.id] === ''))
    .map(q => q.title);
  if (missing.length > 0) {
    return res.status(400).json({ message: `还有 ${missing.length} 题未作答，请完成所有必答题` });
  }

  // 计分
  const result = computeAssessmentScore(assessment.code, mergedAnswers, questions);

  // 生成个性化报告
  const report = generatePersonalReport(
    assessment.code,
    assessment.name,
    result,
    assessment.reportTemplates,
    respondentName || req.user?.nickname || undefined
  );

  let response;
  if (isLove && loveMode === 'deep' && prevResponse) {
    // 深度版续答：更新原免费版答卷，合并全部答案并生成深度报告
    response = await prisma.response.update({
      where: { id: prevResponse.id },
      data: {
        answers: JSON.stringify(mergedAnswers),
        score: JSON.stringify(result.dimensionScores),
        resultType: result.resultType,
        totalScore: result.totalScore,
        report: JSON.stringify(report),
        mode: 'deep',
      },
    });
    return res.json({
      message: '深度报告已生成',
      data: {
        responseId: response.id,
        resultType: response.resultType,
        report: response.report,
        isPaid: response.isPaid,
        pairCode: response.pairCode,
        mode: response.mode,
      },
    });
  }

  // 落库（统一答卷表）
  response = await prisma.response.create({
    data: {
      assessmentId: assessment.id,
      userId: (req.user as any)?.userId ?? null,
      answers: JSON.stringify(mergedAnswers),
      score: JSON.stringify(result.dimensionScores),
      resultType: result.resultType,
      totalScore: result.totalScore,
      report: JSON.stringify(report),
      respondentName: respondentName || req.user?.nickname || null,
      wechatInfo: jsonOrUndefined(wechatInfo),
      respondentInfo: jsonOrUndefined(respondentInfo),
      duration: duration || null,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
      ...(isLove ? { mode: loveMode } : {}),
      ...(pairCode ? { pairCode } : {}),
    },
  });

  // 更新作答人数
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { fillCount: { increment: 1 } },
  });

  res.json({
    message: '提交成功，报告已生成',
    data: {
      responseId: response.id,
      resultType: response.resultType,
      report: response.report,
      isPaid: response.isPaid,
      pairCode: response.pairCode,
      mode: response.mode,
    },
  });
});

// 生成双人配对邀请码：A 作答后点"邀请 TA 一起测"调用（love / lovetri 通用）
publicRouter.post('/love/pair', authenticate, async (req: AuthRequest, res) => {
  const { responseId } = req.body;
  if (!responseId) return res.status(400).json({ message: '缺少 responseId' });
  const response = await prisma.response.findUnique({
    where: { id: Number(responseId) },
    include: { assessment: { select: { code: true, enablePairMatch: true } } },
  });
  if (!response) return res.status(404).json({ message: '答卷不存在' });
  const pairCode = response.pairCode || genPairCode();
  await prisma.response.update({ where: { id: response.id }, data: { pairCode } });
  const code = response.assessment.code;
  if (!response.assessment.enablePairMatch) {
    return res.status(403).json({ message: '双人匹配暂未开放' });
  }
  res.json({ data: { pairCode, inviteLink: `/fill/${code}?pair=${pairCode}` } });
});

// 生成分享码（lovetri）：海报/链接分享用，方便后台追踪分享行为
publicRouter.post('/lovetri/share', authenticate, async (req: AuthRequest, res) => {
  const { responseId } = req.body;
  if (!responseId) return res.status(400).json({ message: '缺少 responseId' });
  const response = await prisma.response.findUnique({ where: { id: Number(responseId) } });
  if (!response) return res.status(404).json({ message: '答卷不存在' });
  let shareCode = response.shareCode;
  let sharedAt = response.sharedAt;
  if (!shareCode) {
    shareCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    sharedAt = new Date();
    await prisma.response.update({ where: { id: response.id }, data: { shareCode, sharedAt } });
  }
  res.json({
    data: { shareCode, sharedAt, shareUrl: `/report/${response.id}` },
  });
});

// 查询双人匹配报告（love）：pairCode 下两份答卷都完成后生成
publicRouter.get('/love/match/:pairCode', async (req, res) => {
  const pairCode = String(req.params.pairCode || '').toUpperCase();
  const responses = await prisma.response.findMany({
    where: { pairCode },
    orderBy: { createdAt: 'asc' },
    include: { assessment: { select: { id: true, code: true, name: true, coverColor: true, enablePairMatch: true } } },
  });
  if (responses.length < 2) {
    return res.status(200).json({
      data: {
        ready: false,
        count: responses.length,
        message: '等待伴侣完成测评后即可生成匹配报告',
      },
    });
  }

  const parseTriangle = (r: any) => {
    const rep = parseJson<any>(r.report) || {};
    // lovetri 报告：三角数据位于 rep.loveTri.triangle；love 报告：rep.triangle
    const lt = rep.loveTri || {};
    const tri = (lt.triangle || rep.triangle || []) as { dimension: string; label: string; avg: number; percent: number }[];
    const map: Record<string, number> = {};
    tri.forEach(t => { map[t.dimension] = t.percent; });
    const dimAvg: Record<string, number> = {};
    tri.forEach(t => { dimAvg[t.dimension] = t.avg; });
    return {
      intimacy: map.intimacy ?? 0,
      passion: map.passion ?? 0,
      commitment: map.commitment ?? 0,
      intimacyAvg: dimAvg.intimacy ?? 0,
      passionAvg: dimAvg.passion ?? 0,
      commitmentAvg: dimAvg.commitment ?? 0,
      tag: rep.resultTitle || rep.resultType || '—',
      // 爱情三角类型信息（lovetri）
      loveTri: {
        type: lt.type || null,
        cn: lt.cn || rep.resultTitle || '—',
        en: lt.en || null,
        tag: lt.tag || null,
        emoji: lt.emoji || '💞',
        avatarName: lt.avatarName || '恋人',
        color: lt.color || '#e8738c',
      },
    };
  };
  const [a, b] = responses;
  const ta = parseTriangle(a);
  const tb = parseTriangle(b);

  // 幂等回填配对关系：双方答卷绑定伴侣信息
  const pairPatch = async () => {
    if (!a.partnerResponseId || !b.partnerResponseId) {
      const aName = b.respondentName || 'TA';
      const bName = a.respondentName || 'TA';
      await prisma.response.update({ where: { id: a.id }, data: { partnerResponseId: b.id, partnerName: aName, matchedAt: new Date() } });
      await prisma.response.update({ where: { id: b.id }, data: { partnerResponseId: a.id, partnerName: bName, matchedAt: new Date() } });
    }
  };
  pairPatch().catch(() => { /* 幂等回填失败不影响报告读取 */ });

  // 差异与重叠度
  const dims = ['intimacy', 'passion', 'commitment'];
  const diffs = dims.map(d => ({ dimension: d, a: (ta as any)[d], b: (tb as any)[d], diff: Math.abs((ta as any)[d] - (tb as any)[d]) }));
  const overlap = Math.round(
    100 - diffs.reduce((s, d) => s + d.diff, 0) / dims.length
  );
  const maxDiff = [...diffs].sort((x, y) => y.diff - x.diff)[0];

  // 匹配建议文案
  const advice: string[] = [];
  if (overlap >= 75) advice.push('你们的爱情三角高度重叠，彼此的付出与期待非常一致，是令人羡慕的默契组合。');
  else if (overlap >= 55) advice.push('你们的爱情三角大体契合，偶有差异，而这些差异恰好是彼此学习的空间。');
  else advice.push('你们的爱情三角差异较明显，这提醒你们：需要认真倾听彼此对这段关系的真实期待。');
  if (maxDiff && maxDiff.diff >= 30) {
    const labelMap: Record<string, string> = { intimacy: '亲密', passion: '激情', commitment: '承诺' };
    advice.push(`你们在「${labelMap[maxDiff.dimension] || maxDiff.dimension}」维度差异最大（差 ${maxDiff.diff} 分），建议就这个部分坦诚沟通，找到彼此都能接受的相处方式。`);
  }
  advice.push('匹配报告只是一个视角，真正的关系需要两个人在日常中共同书写。愿你们坦诚相待、并肩成长。');

  res.json({
    data: {
      ready: true,
      overlap,
      a: { ...ta, responseId: a.id, name: a.respondentName || 'A', createdAt: a.createdAt },
      b: { ...tb, responseId: b.id, name: b.respondentName || 'B', createdAt: b.createdAt },
      diffs,
      advice,
      assessment: responses[0].assessment,
    },
  });
});

// 解锁深度版报告（love）：兑换码 or 模拟微信支付（商户号接入后替换为真实回调）
publicRouter.post('/love/unlock', async (req, res) => {
  const { responseId, code } = req.body;
  if (!responseId) return res.status(400).json({ message: '缺少 responseId' });
  const response = await prisma.response.findUnique({ where: { id: Number(responseId) } });
  if (!response) return res.status(404).json({ message: '答卷不存在' });
  if (response.isPaid) return res.json({ message: '已解锁', data: { isPaid: true } });

  // 兑换码解锁
  if (code && typeof code === 'string') {
    const uc = await prisma.unlockCode.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!uc || uc.status !== 'unused') {
      return res.status(400).json({ message: '兑换码无效或已使用' });
    }
    await prisma.$transaction([
      prisma.unlockCode.update({ where: { id: uc.id }, data: { status: 'used', responseId: response.id, usedAt: new Date() } }),
      prisma.order.create({ data: { orderNo: genOrderNo(), responseId: response.id, amount: uc.amount, status: 'paid', channel: 'unlock', paidAt: new Date() } }),
      prisma.response.update({ where: { id: response.id }, data: { isPaid: true, paidAt: new Date() } }),
    ]);
    return res.json({ message: '解锁成功', data: { isPaid: true } });
  }

  // 微信支付：模拟下单+支付成功（真实商户接入后，此处替换为统一下单 + 回调验签）
  const order = await prisma.order.create({
    data: { orderNo: genOrderNo(), responseId: response.id, amount: 9.9, status: 'paid', channel: 'wechat', paidAt: new Date() },
  });
  await prisma.response.update({ where: { id: response.id }, data: { isPaid: true, paidAt: new Date() } });
  res.json({ message: '支付成功，已解锁', data: { isPaid: true, orderNo: order.orderNo } });
});

// 公开查询报告（通过 responseId，无需登录，便于分享）
publicRouter.get('/responses/:id/report', async (req, res) => {
  const id = Number(req.params.id);
  const response = await prisma.response.findUnique({
    where: { id },
    include: { assessment: { select: { id: true, code: true, name: true, coverColor: true, icon: true, enablePairMatch: true } } },
  });
  if (!response) return res.status(404).json({ message: '报告不存在' });
  res.json({
    data: {
      responseId: response.id,
      resultType: response.resultType,
      totalScore: response.totalScore,
      report: parseJson<any>(response.report),
      assessment: response.assessment,
      createdAt: response.createdAt,
      // love / lovetri 扩展
      mode: response.mode,
      pairCode: response.pairCode,
      isPaid: response.isPaid,
      shareCode: response.shareCode,
      sharedAt: response.sharedAt,
      partnerResponseId: response.partnerResponseId,
      partnerName: response.partnerName,
      matchedAt: response.matchedAt,
      answers: parseJson<any>(response.answers),
    },
  });
});

// 用户根据本地保存的 responseId 批量查询报告概要
publicRouter.post('/my/responses', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.json({ data: [] });
  }
  const uniqueIds = Array.from(new Set(ids.slice(0, 50).map(Number)));
  const responses = await prisma.response.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      assessment: { select: { id: true, code: true, name: true, coverColor: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = responses.map(r => {
    const parsed = parseJson<any>(r.report) || {};
    const resultType = parsed.resultType || '';
    const resultTitle = parsed.resultTitle || '';
    const summary = parsed.summary || '';
    const totalScore = r.totalScore ?? 0;
    const maxScore = parsed.maxScore ?? 0;
    return {
      responseId: r.id,
      assessmentId: r.assessmentId,
      assessmentName: r.assessment?.name || '',
      assessmentCode: r.assessment?.code || '',
      coverColor: r.assessment?.coverColor || '#BC6E43',
      resultType,
      resultTitle,
      summary,
      totalScore,
      maxScore,
      percent: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      createdAt: r.createdAt,
    };
  });

  res.json({ data });
});

// 按当前登录用户查询所有答卷（替代前端 localStorage 方案，保证数据一致）
publicRouter.get('/my/reports', authenticate, async (req: AuthRequest, res) => {
  const userId = (req.user as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: '请先登录' });
  }
  const responses = await prisma.response.findMany({
    where: { userId },
    include: {
      assessment: { select: { id: true, code: true, name: true, coverColor: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = responses.map(r => {
    const parsed = parseJson<any>(r.report) || {};
    const resultType = parsed.resultType || '';
    const resultTitle = parsed.resultTitle || '';
    const summary = parsed.summary || '';
    const totalScore = r.totalScore ?? 0;
    const maxScore = parsed.maxScore ?? 0;
    return {
      responseId: r.id,
      assessmentId: r.assessmentId,
      assessmentCode: r.assessment?.code || '',
      assessmentName: r.assessment?.name || '',
      coverColor: r.assessment?.coverColor || '#BC6E43',
      resultType,
      resultTitle,
      summary,
      totalScore,
      maxScore,
      percent: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      createdAt: r.createdAt,
    };
  });

  // 返回：reports=所有答卷(每测评仅保留最新一份)，doneCodes=已完成测评 code 集合
  const latestMap = new Map<number, any>();
  data.forEach(r => {
    const existing = latestMap.get(r.assessmentId);
    if (!existing || new Date(r.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      latestMap.set(r.assessmentId, r);
    }
  });
  const reports = Array.from(latestMap.values());
  const doneCodes = Array.from(new Set(data.map(r => r.assessmentCode)));

  res.json({ data: { reports, doneCodes } });
});

// 用户删除自己的答卷记录（仅允许删除归属当前用户的答卷）
publicRouter.delete('/my/responses/:id', authenticate, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const userId = (req.user as any)?.userId;
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '答卷 ID 无效' });
  if (!userId) return res.status(401).json({ message: '请先登录' });

  const existing = await prisma.response.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: '答卷不存在' });
  if (existing.userId !== userId) {
    return res.status(403).json({ message: '无权删除他人的答卷' });
  }
  await prisma.response.delete({ where: { id } });
  res.json({ message: '答卷已删除' });
});
