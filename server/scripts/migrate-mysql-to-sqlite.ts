/* eslint-disable */
// 一次性迁移脚本：把旧 MySQL（.mysql-data）中的 User / Response 数据迁入当前 SQLite。
// 用法: cd server && npx tsx scripts/migrate-mysql-to-sqlite.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function readJsonLines(path: string): any[] {
  return fs
    .readFileSync(path, 'utf-8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
}

// JSON 对象 → String 存储；null/undefined 保持原样
function jsonField(v: any): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

async function migrateAssessments() {
  const existing = new Set((await prisma.assessment.findMany({ select: { id: true } })).map(a => a.id));
  const assessments = readJsonLines('/tmp/mysql_assessments.jsonl');
  for (const a of assessments) {
    if (existing.has(a.id)) continue; // 已存在则跳过
    await prisma.assessment.create({
      data: {
        id: a.id,
        code: a.code,
        name: a.name,
        nameEn: a.nameEn ?? null,
        category: a.category,
        description: a.description ?? '',
        instructions: a.instructions ?? null,
        coverColor: a.coverColor ?? '#6366F1',
        icon: a.icon ?? null,
        questions: jsonField(a.questions) ?? '[]',
        dimensions: jsonField(a.dimensions) ?? '[]',
        reportTemplates: jsonField(a.reportTemplates) ?? '{}',
        status: a.status ?? 'published',
        sortOrder: a.sortOrder ?? 0,
        fillCount: a.fillCount ?? 0,
        createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
        updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
      },
    });
    console.log(`Assessment 补充迁移: ${a.id}:${a.code}`);
  }
}

async function migrateUsers() {
  const users = readJsonLines('/tmp/mysql_users.jsonl');
  // 清空现有 User（避免主键冲突），同时把依赖它的 Response 也清空
  await prisma.response.deleteMany();
  await prisma.user.deleteMany();

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        username: u.username,
        password: u.password ?? '',
        displayName: u.displayName,
        nickname: u.nickname,
        avatar: u.avatar,
        wechatOpenId: u.wechatOpenId,
        role: u.role ?? 'user',
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
      },
    });
  }
  console.log(`User 迁移完成: ${users.length} 条`);
}

async function migrateResponses() {
  const responses = readJsonLines('/tmp/mysql_responses.jsonl');
  for (const r of responses) {
    await prisma.response.create({
      data: {
        id: r.id,
        assessmentId: r.assessmentId,
        userId: r.userId ?? null,
        answers: jsonField(r.answers) ?? '{}',
        score: jsonField(r.score) ?? '{}',
        resultType: r.resultType ?? '',
        totalScore: r.totalScore ?? null,
        report: jsonField(r.report) ?? '{}',
        respondentName: r.respondentName ?? null,
        wechatInfo: jsonField(r.wechatInfo),
        respondentInfo: jsonField(r.respondentInfo),
        duration: r.duration ?? null,
        ipAddress: r.ipAddress ?? null,
        userAgent: r.userAgent ?? null,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        isPaid: !!r.isPaid,
        mode: r.mode ?? null,
        paidAt: r.paidAt ? new Date(r.paidAt) : null,
        pairCode: r.pairCode ?? null,
      },
    });
  }
  console.log(`Response 迁移完成: ${responses.length} 条`);
}

(async () => {
  try {
    await migrateAssessments();
    await migrateUsers();
    await migrateResponses();
  } catch (e) {
    console.error('迁移失败:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
