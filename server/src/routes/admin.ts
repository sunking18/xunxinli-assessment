import { Router } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const adminRouter = Router();

// 安全解析 JSON 字符串字段（SQLite 下以字符串存储）
function parseJson<T>(value: any): T {
  if (value == null) return (Array.isArray(value) ? [] : {}) as T;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return (Array.isArray(value) ? [] : {}) as T;
  }
}
// 对象转字符串存储（String 字段）；null/undefined 保留
function jsonOrNull(value: any): any {
  if (value == null) return value;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

adminRouter.use(authenticate);

// ==================== 仪表盘统计 ====================
adminRouter.get('/stats', async (req, res) => {
  const [assessmentCount, responseCount, publishedCount, recentResponses, categoryAgg, assessments, responses] =
    await Promise.all([
      prisma.assessment.count(),
      prisma.response.count(),
      prisma.assessment.count({ where: { status: 'published' } }),
      prisma.response.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { assessment: { select: { code: true, name: true, coverColor: true } } },
      }),
      prisma.assessment.groupBy({ by: ['category'], _count: { _all: true } }),
      prisma.assessment.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.response.findMany({ select: { id: true, assessmentId: true, userId: true } }),
    ]);

  // 计算每个测评的去重人数
  const fillMap = new Map<number, number>();
  const uniquePerAssessment = new Map<number, Set<number | string>>();
  for (const r of responses) {
    let set = uniquePerAssessment.get(r.assessmentId);
    if (!set) {
      set = new Set();
      uniquePerAssessment.set(r.assessmentId, set);
    }
    set.add(r.userId ?? `anon-${r.id}`);
  }
  for (const [aid, set] of uniquePerAssessment.entries()) {
    fillMap.set(aid, set.size);
  }

  const assessmentList = assessments.map(a => ({
    id: a.id,
    code: a.code,
    name: a.name,
    category: a.category,
    description: a.description,
    coverColor: a.coverColor,
    icon: a.icon,
    status: a.status,
    sortOrder: a.sortOrder,
    questionCount: parseJson<any[]>(a.questions).length,
    fillCount: fillMap.get(a.id) ?? 0,
  }));

  res.json({
    data: {
      assessmentCount,
      publishedCount,
      responseCount,
      categories: categoryAgg.map(c => ({ category: c.category, count: c._count._all })),
      recentResponses,
      assessments: assessmentList,
    },
  });
});

// ==================== 测评管理 CRUD ====================
adminRouter.get('/assessments', async (req, res) => {
  const assessments = await prisma.assessment.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { responses: true } } },
  });
  // 已测人数：有登录 userId 的按 userId 去重，匿名答卷按条计
  const parsedResponses = await prisma.response.findMany({
    select: { assessmentId: true, userId: true },
  });
  const seen = new Map<number, Set<number | string>>();
  for (const r of parsedResponses) {
    const k = r.userId ?? `anon-${r.assessmentId}-${seen.size}`;
    if (!seen.has(r.assessmentId)) seen.set(r.assessmentId, new Set());
    seen.get(r.assessmentId)!.add(k);
  }
  const data = assessments.map(a => ({
    ...a,
    responseCount: a._count.responses,
    questionCount: Array.isArray(parseJson<any[]>(a.questions)) ? parseJson<any[]>(a.questions).length : 0,
    fillCount: seen.get(a.id)?.size || 0,
  }));
  res.json({ data });
});

adminRouter.get('/assessments/:id', async (req, res) => {
  const id = Number(req.params.id);
  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return res.status(404).json({ message: '测评不存在' });
  res.json({ data: assessment });
});

adminRouter.post('/assessments', async (req, res) => {
  const { code, name, nameEn, category, description, instructions, coverColor, icon, questions, dimensions, reportTemplates, status, sortOrder, enablePairMatch } = req.body;
  if (!code || !name || !Array.isArray(questions)) {
    return res.status(400).json({ message: '缺少必填字段（code / name / questions）' });
  }
  const exists = await prisma.assessment.findUnique({ where: { code } });
  if (exists) return res.status(409).json({ message: `测评码 ${code} 已存在` });

  const assessment = await prisma.assessment.create({
    data: {
      code,
      name,
      nameEn,
      category: category || '自定义测评',
      description: description || '',
      instructions: instructions || null,
      coverColor: coverColor || '#6366F1',
      icon: icon || null,
      questions: jsonOrNull(questions) || '[]',
      dimensions: jsonOrNull(dimensions) || '[]',
      reportTemplates: jsonOrNull(reportTemplates || { code, templates: {} }),
      status: status || 'published',
      sortOrder: sortOrder || 0,
      enablePairMatch: enablePairMatch ?? false,
    },
  });
  res.status(201).json({ message: '测评创建成功', data: assessment });
});

adminRouter.put('/assessments/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { code, name, nameEn, category, description, instructions, coverColor, icon, questions, dimensions, reportTemplates, status, sortOrder, enablePairMatch } = req.body;

  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return res.status(404).json({ message: '测评不存在' });

  if (code && code !== assessment.code) {
    const exists = await prisma.assessment.findUnique({ where: { code } });
    if (exists) return res.status(409).json({ message: `测评码 ${code} 已存在` });
  }

  const updated = await prisma.assessment.update({
    where: { id },
    data: {
      code: code ?? assessment.code,
      name: name ?? assessment.name,
      nameEn: nameEn ?? assessment.nameEn,
      category: category ?? assessment.category,
      description: description ?? assessment.description,
      instructions: instructions ?? assessment.instructions,
      coverColor: coverColor ?? assessment.coverColor,
      icon: icon ?? assessment.icon,
      questions: questions !== undefined ? (jsonOrNull(questions) ?? '[]') : assessment.questions,
      dimensions: dimensions !== undefined ? (jsonOrNull(dimensions) ?? '[]') : assessment.dimensions,
      reportTemplates: reportTemplates !== undefined ? jsonOrNull(reportTemplates) : assessment.reportTemplates,
      status: status ?? assessment.status,
      sortOrder: sortOrder ?? assessment.sortOrder,
      enablePairMatch: enablePairMatch ?? assessment.enablePairMatch,
    },
  });
  res.json({ message: '测评已更新', data: updated });
});

adminRouter.delete('/assessments/:id', async (req, res) => {
  const id = Number(req.params.id);
  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return res.status(404).json({ message: '测评不存在' });
  await prisma.assessment.update({ where: { id }, data: { status: 'deleted' } });
  res.json({ message: '测评已标记为删除状态，可在列表中恢复' });
});

// 恢复被软删除的测评
adminRouter.post('/assessments/:id/restore', async (req, res) => {
  const id = Number(req.params.id);
  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return res.status(404).json({ message: '测评不存在' });
  if (assessment.status !== 'deleted') return res.status(400).json({ message: '该测评未处于删除状态，无需恢复' });
  await prisma.assessment.update({ where: { id }, data: { status: 'published' } });
  res.json({ message: '测评已恢复' });
});

// 生成测评二维码（dataURL）
adminRouter.get('/assessments/:id/qrcode', async (req, res) => {
  const id = Number(req.params.id);
  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return res.status(404).json({ message: '测评不存在' });

  const base = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
  const url = `${base}/fill/${assessment.code}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, errorCorrectionLevel: 'H' });
  res.json({ data: { url, dataUrl } });
});

// ==================== 答卷管理 ====================
// 全局答卷列表（所有测评，含测评信息）
adminRouter.get('/responses', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);

  const [total, list] = await Promise.all([
    prisma.response.count(),
    prisma.response.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        resultType: true,
        totalScore: true,
        respondentName: true,
        duration: true,
        createdAt: true,
        assessment: { select: { id: true, code: true, name: true, coverColor: true } },
      },
    }),
  ]);
  res.json({ data: { total, page, pageSize, list } });
});

adminRouter.get('/assessments/:id/responses', async (req, res) => {
  const id = Number(req.params.id);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);

  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

  const where: any = { assessmentId: id };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate && !isNaN(startDate.getTime())) where.createdAt.gte = startDate;
    if (endDate && !isNaN(endDate.getTime())) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [total, list] = await Promise.all([
    prisma.response.count({ where }),
    prisma.response.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        resultType: true,
        totalScore: true,
        respondentName: true,
        duration: true,
        createdAt: true,
        // 分享与配对扩展（love / lovetri）
        mode: true,
        pairCode: true,
        shareCode: true,
        partnerName: true,
        matchedAt: true,
      },
    }),
  ]);
  res.json({ data: { total, page, pageSize, list } });
});

// ==================== 报告中心（按问卷分组） ====================
adminRouter.get('/reports/grouped', async (req, res) => {
  const keyword = String(req.query.keyword || '').trim().toLowerCase();

  const assessments = await prisma.assessment.findMany({
    orderBy: { id: 'asc' },
    include: {
      responses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, respondentName: true },
      },
      _count: { select: { responses: true } },
    },
  });

  const data = assessments
    .filter(a => !keyword || a.name.toLowerCase().includes(keyword) || (a.nameEn || '').toLowerCase().includes(keyword))
    .map(a => ({
      id: a.id,
      code: a.code,
      name: a.name,
      nameEn: a.nameEn,
      category: a.category,
      description: a.description,
      coverColor: a.coverColor,
      icon: a.icon,
      responseCount: a._count.responses,
      latestResponseAt: a.responses[0]?.createdAt || null,
      latestRespondentName: a.responses[0]?.respondentName || null,
    }));

  res.json({ data });
});

// 为没有 options 的 scale 型题目动态生成选项标签，便于后台按选项展示
function inferScaleLabel(value: number, min: number, max: number, minLabel: string, maxLabel: string): string {
  if (value === min) return minLabel;
  if (value === max) return maxLabel;
  if (max - min === 4) {
    const left = minLabel.replace(/^非常/, '').trim();
    const right = maxLabel.replace(/^非常/, '').trim();
    if (left && right && left !== right) {
      const labels = [minLabel, left, '一般', right, maxLabel];
      return labels[value - min] || String(value);
    }
  }
  return String(value);
}

function buildScaleOptions(scaleConfig: any) {
  if (!scaleConfig) return [];
  const start = Number(scaleConfig.min) || 1;
  const end = Number(scaleConfig.max) || 5;
  const options: { value: number; label: string; score: number }[] = [];
  for (let v = start; v <= end; v++) {
    options.push({
      value: v,
      label: inferScaleLabel(v, start, end, String(scaleConfig.minLabel || '非常不同意'), String(scaleConfig.maxLabel || '非常同意')),
      score: v,
    });
  }
  return options;
}

// ==================== 测评数据分析 ====================
// 同一用户（userId）只取最后一次作答；匿名作答按单条计
adminRouter.get('/assessments/:id/analytics', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '测评 ID 无效' });

  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return res.status(404).json({ message: '测评不存在' });

  const allResponses = await prisma.response.findMany({
    where: { assessmentId: id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, username: true, nickname: true, displayName: true } } },
  });

  // SQLite 下 JSON 字段以字符串存储，先统一解析为对象（MySQL TEXT 场景下 parseJson 会原样返回对象）
  const parsedResponses = allResponses.map(r => ({
    ...r,
    answers: parseJson<any>(r.answers),
    score: parseJson<any>(r.score),
    report: parseJson<any>(r.report),
    wechatInfo: parseJson<any>(r.wechatInfo),
    respondentInfo: parseJson<any>(r.respondentInfo),
  }));

  // 已测人数：有登录 userId 的按 userId 去重，匿名答卷按条计
  const fillCount = new Set(parsedResponses.map(r => r.userId ?? `anon-${r.id}`)).size;

  // 每个登录用户只保留最后一次作答
  const latestMap = new Map<number | string, (typeof parsedResponses)[number]>();
  for (const r of parsedResponses) {
    const key = r.userId ?? `anon-${r.id}`;
    if (!latestMap.has(key)) latestMap.set(key, r);
  }
  const latest = Array.from(latestMap.values());

  const dimensions = parseJson<any[]>(assessment.dimensions);
  const rawQuestions = parseJson<any[]>(assessment.questions);
  const questions = rawQuestions.map((q: any) => {
    const existingOptions = Array.isArray(q.options) ? q.options : [];
    if (existingOptions.length > 0) return q;
    const opts = buildScaleOptions(q.scaleConfig);
    return opts.length > 0 ? { ...q, options: opts } : q;
  });
  const sevLevels = ['良好', '轻度', '中度', '重度'];
  const deriveSeverity = (score: any, maxScore: number): number => {
    const s = Number(score);
    if (!Number.isFinite(s) || !maxScore || maxScore <= 0) return -1;
    const ratio = s / maxScore;
    if (ratio < 0.6) return 0;
    if (ratio < 0.75) return 1;
    if (ratio < 0.9) return 2;
    return 3;
  };

  // 维度统计（基于每人最后一次作答）
  const dimensionStats = dimensions.map((dim: any) => {
    const sevCounts = [0, 0, 0, 0];
    let sumScore = 0;
    let sumConcern = 0;
    let scored = 0;
    latest.forEach(r => {
      const scores = (r.score as any) || {};
      const report = (r.report as any) || {};
      let sev: number | undefined;
      const narratives = (report.narratives || []) as any[];
      const n = narratives.find((x: any) => x.dimension === dim.code);
      if (n && typeof n.severity === 'number') sev = n.severity;
      const raw = scores[dim.code];
      if (typeof raw === 'number') {
        if (sev === undefined) sev = deriveSeverity(raw, Number(dim.maxScore) || 0);
        sumScore += raw;
        scored++;
      }
      if (typeof (report.concern || {})[dim.code] === 'number') {
        sumConcern += (report.concern || {})[dim.code];
      }
      if (sev !== undefined && sev >= 0 && sev <= 3) sevCounts[sev]++;
    });
    return {
      code: dim.code,
      name: dim.name || dim.code,
      maxScore: Number(dim.maxScore) || 0,
      avgScore: scored ? +(sumScore / scored).toFixed(1) : 0,
      avgConcern: latest.length ? Math.round(sumConcern / latest.length) : 0,
      severity: sevLevels.map((label, i) => ({ label, count: sevCounts[i] })),
    };
  });

  // 题目统计（选项 1-5 分布，基于每人最后一次作答）
  const questionStats = questions.map((q: any) => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    let total = 0;
    latest.forEach(r => {
      const answers = (r.answers as any) || {};
      const num = Number(answers[q.id]);
      if (Number.isFinite(num) && num >= 1 && num <= 5) {
        counts[num]++;
        sum += num;
        total++;
      }
    });
    return {
      id: q.id,
      title: q.title || '',
      dimension: q.dimension || '',
      total,
      avgScore: total ? +(sum / total).toFixed(2) : 0,
      counts: [1, 2, 3, 4, 5].map(v => ({ value: v, count: counts[v] })),
    };
  });

  // 人口属性分布（基于每人最后一次作答）
  const groupByInfo = (key: string, fallback?: (r: any) => string) => {
    const m = new Map<string, number>();
    latest.forEach(r => {
      const info = (r.respondentInfo as any) || {};
      const wechat = (r.wechatInfo as any) || {};
      let v = String(info[key] ?? '').trim();
      if (!v && fallback) v = fallback(r).trim();
      if (!v && wechat[key]) v = String(wechat[key]).trim();
      v = v || '未填写';
      m.set(v, (m.get(v) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  // 近 30 天每日新增（全部提交）
  const dailyTrend: { date: string; count: number }[] = [];
  const days = new Map<string, number>();
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.set(key, 0);
  }
  parsedResponses.forEach(r => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (days.has(key)) days.set(key, (days.get(key) || 0) + 1);
  });
  days.forEach((count, date) => dailyTrend.push({ date, count }));

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayCount = parsedResponses.filter(r => r.createdAt >= startOfToday).length;
  const durations = parsedResponses.filter(r => typeof r.duration === 'number' && r.duration > 0).map(r => r.duration as number);
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  const resultTypeDist = Array.from(
    latest.reduce((m, r) => m.set(r.resultType, (m.get(r.resultType) || 0) + 1), new Map<string, number>()).entries()
  )
    .map(([resultType, count]) => ({ resultType, count }))
    .sort((a, b) => b.count - a.count);

  const getInfo = (info: any, key: string) => String(info?.[key] ?? '').trim() || null;

  const buildResponseRow = (r: any) => {
    const info = (r.respondentInfo as any) || {};
    const wechat = (r.wechatInfo as any) || {};
    const duration = typeof r.duration === 'number' ? r.duration : null;
    const startTime = duration ? new Date(new Date(r.createdAt).getTime() - duration * 1000) : null;
    return {
      responseId: r.id,
      userId: r.userId,
      username: r.user?.username || null,
      nickname: r.user?.nickname || null,
      displayName: r.user?.displayName || null,
      respondentName: r.respondentName || null,
      ipAddress: r.ipAddress || null,
      duration,
      startTime,
      createdAt: r.createdAt,
      resultType: r.resultType,
      totalScore: r.totalScore,
      answers: r.answers,
      respondentInfo: {
        gender: getInfo(info, 'gender'),
        age: getInfo(info, 'age'),
        occupation: getInfo(info, 'occupation'),
        income: getInfo(info, 'income'),
        city: getInfo(info, 'city') || getInfo(wechat, 'city'),
        region: getInfo(info, 'region') || getInfo(wechat, 'province'),
        nameInitials: getInfo(info, 'nameInitials'),
        phoneLast4: getInfo(info, 'phoneLast4'),
      },
    };
  };

  const latestResponses = latest.map(r => buildResponseRow(r));

  const allResponseRows = parsedResponses.map(r => buildResponseRow(r));

  res.json({
    data: {
      assessment: {
        id: assessment.id,
        code: assessment.code,
        name: assessment.name,
        questionCount: questions.length,
        fillCount,
        questions,
      },
      summary: {
        totalResponses: parsedResponses.length,
        uniqueUsers: new Set(parsedResponses.filter(r => r.userId).map(r => r.userId)).size,
        todayCount,
        avgDuration,
        latestCount: latest.length,
      },
      resultTypeDist,
      dimensionStats,
      questionStats,
      demography: {
        gender: groupByInfo('gender'),
        age: groupByInfo('age'),
        occupation: groupByInfo('occupation'),
        city: groupByInfo('city'),
        income: groupByInfo('income'),
      },
      dailyTrend,
      latestResponses,
      allResponses: allResponseRows,
    },
  });
});

adminRouter.get('/responses/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '答卷 ID 无效' });
  const response = await prisma.response.findUnique({
    where: { id },
    include: { assessment: { select: { id: true, code: true, name: true, questions: true } } },
  });
  if (!response) return res.status(404).json({ message: '答卷不存在' });
  // SQLite 下 report/answers/score 等以 JSON 字符串存储，返回前统一解析为对象
  res.json({
    data: {
      ...response,
      answers: parseJson<any>(response.answers),
      score: parseJson<any>(response.score),
      report: parseJson<any>(response.report),
      wechatInfo: parseJson<any>(response.wechatInfo),
      respondentInfo: parseJson<any>(response.respondentInfo),
      assessment: {
        ...response.assessment,
        questions: parseJson<any[]>(response.assessment.questions),
      },
    },
  });
});

adminRouter.delete('/responses/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '答卷 ID 无效' });
  await prisma.response.delete({ where: { id } });
  res.json({ message: '答卷已删除' });
});

// 导出答卷数据（CSV / JSON）
adminRouter.get('/assessments/:id/responses/export', async (req, res) => {
  const id = Number(req.params.id);
  const mode = (req.query.mode as 'option' | 'score' | undefined) || 'option';
  const format = (req.query.format as 'csv' | 'json' | undefined) || 'csv';
  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return res.status(404).json({ message: '测评不存在' });

  const questions = parseJson<any[]>(assessment.questions);
  const responses = await prisma.response.findMany({
    where: { assessmentId: id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, username: true, nickname: true, displayName: true } } },
  });

  const getInfo = (info: any, key: string) => String(info?.[key] ?? '').trim() || '';

  const buildRows = () => responses.map((r, idx) => {
    const info = parseJson<any>(r.respondentInfo) || {};
    const wechat = parseJson<any>(r.wechatInfo) || {};
    const answers = parseJson<Record<string, any>>(r.answers) || {};
    const duration = typeof r.duration === 'number' ? r.duration : null;
    const startTime = duration
      ? new Date(new Date(r.createdAt).getTime() - duration * 1000)
      : null;

    const questionCols: Record<string, string | number> = {};
    questions.forEach((q: any) => {
      const raw = answers[q.id];
      if (mode === 'score') {
        const opts = Array.isArray(q.options) ? q.options : [];
        const matched = opts.find((o: any) => String(o.value) === String(raw));
        questionCols[q.id] = matched && typeof matched.score === 'number'
          ? matched.score
          : (raw ?? '');
      } else {
        // 按选项：根据问卷设置，将分数 value 转换为对应的选项内容 label
        const opts = Array.isArray(q.options) ? q.options : [];
        const matched = opts.find((o: any) => String(o.value) === String(raw));
        questionCols[q.id] = matched && matched.label ? matched.label : (raw ?? '');
      }
    });

    return {
      index: idx + 1,
      responseId: r.id,
      userId: r.userId ?? '',
      username: r.user?.username || '',
      nickname: r.user?.nickname || r.user?.displayName || '',
      respondentName: r.respondentName || '',
      ipAddress: r.ipAddress || '',
      startTime: startTime ? startTime.toISOString() : '',
      endTime: r.createdAt.toISOString(),
      duration: duration ?? '',
      gender: getInfo(info, 'gender'),
      age: getInfo(info, 'age'),
      occupation: getInfo(info, 'occupation'),
      income: getInfo(info, 'income'),
      city: getInfo(info, 'city') || getInfo(wechat, 'city'),
      region: getInfo(info, 'region') || getInfo(wechat, 'province'),
      nameInitials: getInfo(info, 'nameInitials'),
      phoneLast4: getInfo(info, 'phoneLast4'),
      totalScore: r.totalScore ?? '',
      resultType: r.resultType,
      ...questionCols,
    };
  });

  if (format === 'json') {
    return res.json({ data: buildRows() });
  }

  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  // 固定信息列
  const fixedHeaders = [
    { label: '编号', key: 'index' },
    { label: '答卷ID', key: 'responseId' },
    { label: '用户ID', key: 'userId' },
    { label: '用户名', key: 'username' },
    { label: '昵称', key: 'nickname' },
    { label: '答题人姓名', key: 'respondentName' },
    { label: 'IP地址', key: 'ipAddress' },
    { label: '开始时间', key: 'startTime' },
    { label: '结束时间', key: 'endTime' },
    { label: '答题时长(秒)', key: 'duration' },
    { label: '性别', key: 'gender' },
    { label: '年龄', key: 'age' },
    { label: '职业', key: 'occupation' },
    { label: '收入', key: 'income' },
    { label: '城市', key: 'city' },
    { label: '地区', key: 'region' },
    { label: '姓名缩写', key: 'nameInitials' },
    { label: '手机尾号', key: 'phoneLast4' },
    { label: '总分', key: 'totalScore' },
    { label: '结果类型', key: 'resultType' },
  ];
  const headers = [...fixedHeaders.map(h => h.label)];
  const questionHeaders: { label: string; qid: string }[] = [];
  questions.forEach((q: any, i: number) => {
    const label = `Q${i + 1}-${(q.title || '').substring(0, 30)}`;
    questionHeaders.push({ label, qid: q.id });
    headers.push(label);
  });

  const rows = buildRows().map((row: any) => {
    const cells: string[] = [];
    for (const h of fixedHeaders) cells.push(esc(row[h.key]));
    for (const qh of questionHeaders) cells.push(esc(row[qh.qid]));
    return cells.join(',');
  });

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="responses-${assessment.code}-${mode}.csv"`);
  res.send(csv);
});

// ===== 兑换码管理（深度版解锁）=====
// 批量生成兑换码
adminRouter.post('/unlock-codes/generate', async (req, res) => {
  const { count = 10, amount = 9.9 } = req.body;
  const n = Math.min(Math.max(Number(count) || 10, 1), 500);
  const gen = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };
  const codes = Array.from({ length: n }, () => gen());
  await prisma.unlockCode.createMany({
    data: codes.map(code => ({ code, amount: Number(amount) || 9.9 })),
  });
  res.json({ message: `已生成 ${n} 个兑换码`, data: { count: n, codes } });
});

// 兑换码列表
adminRouter.get('/unlock-codes', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);
  const status = req.query.status as string | undefined;
  const where: any = {};
  if (status && status !== 'all') where.status = status;
  const [total, list] = await Promise.all([
    prisma.unlockCode.count({ where }),
    prisma.unlockCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  res.json({ data: { total, list, page, pageSize } });
});

// 作废兑换码
adminRouter.post('/unlock-codes/:id/revoke', async (req, res) => {
  const id = Number(req.params.id);
  const uc = await prisma.unlockCode.findUnique({ where: { id } });
  if (!uc) return res.status(404).json({ message: '兑换码不存在' });
  if (uc.status === 'used') return res.status(400).json({ message: '已使用的兑换码不能作废' });
  await prisma.unlockCode.update({ where: { id }, data: { status: 'revoked' } });
  res.json({ message: '已作废' });
});

// 订单列表（深度版付费记录）
adminRouter.get('/orders', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);
  const [total, list] = await Promise.all([
    prisma.order.count(),
    (prisma.order as any).findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { response: { select: { id: true, resultType: true, mode: true, pairCode: true } } },
    }),
  ]);
  res.json({ data: { total, list, page, pageSize } });
});
