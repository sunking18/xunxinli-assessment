/**
 * 建表巡检脚本（幂等，可随意重复执行）
 *
 * 背景：
 *   之前 Dockerfile 的启动命令是 `prisma db push && node dist/index.js`，
 *   每次容器启动都要做一次全库 schema diff，既拖慢启动，又会在数据库不可达 /
 *   schema 有破坏性差异时阻塞服务启动，导致全站 502。
 *
 * 现在的分工：
 *   - 服务启动只管启动：CMD 直接 `node dist/index.js`，不再依赖建表成功
 *   - 建表走本脚本：只检查「哪些表不存在」，缺失才建，已存在就跳过（毫秒级、无锁风险）
 *   - 字段变更（加列/改类型）不属于本脚本职责，需要时手动执行 `--sync`
 *
 * 用法（容器内）：
 *   node dist/scripts/ensureTables.js           # 只补建缺失的表（安全，可放定时任务）
 *   node dist/scripts/ensureTables.js --sync    # 补建缺失表 + prisma db push 同步字段结构
 *   node dist/scripts/ensureTables.js --check   # 只检查不建表，返回码 1 表示有表缺失
 *
 * 退出码：0 成功 / 1 失败（--check 模式下有表缺失也返回 1）
 */

import { execSync } from 'child_process';
import { prisma } from '../utils/prisma';

// 建表语句与 prisma/schema.prisma 保持一致，全部使用 IF NOT EXISTS，可重复执行。
// ⚠️ 修改 schema.prisma 新增模型时，需同步在这里补一条 DDL。
const TABLE_DDL: { name: string; ddl: string }[] = [
  {
    name: 'User',
    ddl: `CREATE TABLE IF NOT EXISTS \`User\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`username\` varchar(191) NOT NULL,
      \`password\` varchar(191) NOT NULL,
      \`displayName\` varchar(191) NOT NULL,
      \`nickname\` varchar(191) DEFAULT NULL,
      \`avatar\` varchar(191) DEFAULT NULL,
      \`email\` varchar(191) DEFAULT NULL,
      \`phone\` varchar(191) DEFAULT NULL,
      \`gender\` varchar(191) DEFAULT NULL,
      \`birthday\` varchar(191) DEFAULT NULL,
      \`wechatOpenId\` varchar(191) DEFAULT NULL,
      \`wechatUnionId\` varchar(191) DEFAULT NULL,
      \`status\` varchar(191) NOT NULL DEFAULT 'active',
      \`role\` varchar(191) NOT NULL DEFAULT 'admin',
      \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` datetime(3) NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`User_wechatOpenId_key\` (\`wechatOpenId\`),
      KEY \`User_wechatUnionId_idx\` (\`wechatUnionId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
  {
    name: 'Assessment',
    ddl: `CREATE TABLE IF NOT EXISTS \`Assessment\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`code\` varchar(191) NOT NULL,
      \`name\` varchar(191) NOT NULL,
      \`nameEn\` varchar(191) DEFAULT NULL,
      \`category\` varchar(191) NOT NULL,
      \`description\` text NOT NULL,
      \`instructions\` text,
      \`coverColor\` varchar(191) NOT NULL DEFAULT '#6366F1',
      \`icon\` varchar(191) DEFAULT NULL,
      \`questions\` text NOT NULL,
      \`dimensions\` text NOT NULL,
      \`reportTemplates\` text NOT NULL,
      \`status\` varchar(191) NOT NULL DEFAULT 'published',
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`enablePairMatch\` boolean NOT NULL DEFAULT false,
      \`fillCount\` int NOT NULL DEFAULT 0,
      \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` datetime(3) NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`Assessment_code_key\` (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
  {
    name: 'Response',
    ddl: `CREATE TABLE IF NOT EXISTS \`Response\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`assessmentId\` int NOT NULL,
      \`userId\` int DEFAULT NULL,
      \`answers\` text NOT NULL,
      \`score\` text NOT NULL,
      \`resultType\` varchar(191) NOT NULL,
      \`totalScore\` double DEFAULT NULL,
      \`report\` text NOT NULL,
      \`respondentName\` varchar(191) DEFAULT NULL,
      \`wechatInfo\` text,
      \`respondentInfo\` text,
      \`duration\` int DEFAULT NULL,
      \`ipAddress\` varchar(255) DEFAULT NULL,
      \`userAgent\` text,
      \`mode\` varchar(191) DEFAULT NULL,
      \`pairCode\` varchar(191) DEFAULT NULL,
      \`isPaid\` boolean NOT NULL DEFAULT false,
      \`paidAt\` datetime(3) DEFAULT NULL,
      \`shareCode\` varchar(191) DEFAULT NULL,
      \`sharedAt\` datetime(3) DEFAULT NULL,
      \`partnerResponseId\` int DEFAULT NULL,
      \`partnerName\` varchar(191) DEFAULT NULL,
      \`matchedAt\` datetime(3) DEFAULT NULL,
      \`status\` varchar(191) NOT NULL DEFAULT 'active',
      \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      KEY \`Response_assessmentId_createdAt_idx\` (\`assessmentId\`,\`createdAt\`),
      KEY \`Response_userId_idx\` (\`userId\`),
      KEY \`Response_pairCode_idx\` (\`pairCode\`),
      KEY \`Response_shareCode_idx\` (\`shareCode\`),
      KEY \`Response_status_idx\` (\`status\`),
      CONSTRAINT \`Response_assessmentId_fkey\` FOREIGN KEY (\`assessmentId\`) REFERENCES \`Assessment\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`Response_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
  {
    name: 'Order',
    ddl: `CREATE TABLE IF NOT EXISTS \`Order\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`orderNo\` varchar(191) NOT NULL,
      \`responseId\` int DEFAULT NULL,
      \`amount\` double NOT NULL,
      \`status\` varchar(191) NOT NULL DEFAULT 'pending',
      \`channel\` varchar(191) NOT NULL DEFAULT 'wechat',
      \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`paidAt\` datetime(3) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`Order_orderNo_key\` (\`orderNo\`),
      KEY \`Order_responseId_idx\` (\`responseId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
  {
    name: 'UnlockCode',
    ddl: `CREATE TABLE IF NOT EXISTS \`UnlockCode\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`code\` varchar(191) NOT NULL,
      \`amount\` double NOT NULL DEFAULT 9.9,
      \`status\` varchar(191) NOT NULL DEFAULT 'unused',
      \`responseId\` int DEFAULT NULL,
      \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`usedAt\` datetime(3) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UnlockCode_code_key\` (\`code\`),
      KEY \`UnlockCode_responseId_idx\` (\`responseId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
  {
    name: 'Admin',
    ddl: `CREATE TABLE IF NOT EXISTS \`Admin\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`username\` varchar(191) NOT NULL,
      \`password\` varchar(191) NOT NULL,
      \`displayName\` varchar(191) NOT NULL,
      \`role\` varchar(191) NOT NULL DEFAULT 'admin',
      \`status\` varchar(191) NOT NULL DEFAULT 'active',
      \`lastLoginAt\` datetime(3) DEFAULT NULL,
      \`lastLoginIp\` varchar(191) DEFAULT NULL,
      \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` datetime(3) NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`Admin_username_key\` (\`username\`),
      KEY \`Admin_status_idx\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
  {
    name: 'AdminLog',
    ddl: `CREATE TABLE IF NOT EXISTS \`AdminLog\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`adminId\` int DEFAULT NULL,
      \`username\` varchar(191) NOT NULL,
      \`action\` varchar(191) NOT NULL,
      \`module\` varchar(191) NOT NULL,
      \`targetId\` varchar(191) DEFAULT NULL,
      \`detail\` text,
      \`ip\` varchar(191) DEFAULT NULL,
      \`userAgent\` text,
      \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      KEY \`AdminLog_adminId_createdAt_idx\` (\`adminId\`,\`createdAt\`),
      KEY \`AdminLog_createdAt_idx\` (\`createdAt\`),
      KEY \`AdminLog_module_idx\` (\`module\`),
      CONSTRAINT \`AdminLog_adminId_fkey\` FOREIGN KEY (\`adminId\`) REFERENCES \`Admin\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
];

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const needSync = args.includes('--sync');

  let rows: any[];
  try {
    rows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
    );
  } catch (err: any) {
    console.error('[ensure-tables] 连接数据库失败:', err?.message || err);
    process.exit(1);
  }

  const existing = new Set<string>((rows || []).map(r => r.name));
  const missing = TABLE_DDL.filter(t => !existing.has(t.name));

  console.log(`[ensure-tables] 应存在 ${TABLE_DDL.length} 张表，已存在 ${TABLE_DDL.length - missing.length} 张`);

  if (missing.length === 0) {
    console.log('[ensure-tables] ✅ 所有表均已就绪，无需创建');
  } else {
    console.log(`[ensure-tables] 缺失 ${missing.length} 张表：${missing.map(m => m.name).join('、')}`);
  }

  if (checkOnly) {
    await prisma.$disconnect();
    process.exit(missing.length === 0 ? 0 : 1);
  }

  let created = 0;
  for (const table of missing) {
    try {
      await prisma.$executeRawUnsafe(table.ddl);
      created += 1;
      console.log(`[ensure-tables] ➕ 已创建表 ${table.name}`);
    } catch (err: any) {
      console.error(`[ensure-tables] ❌ 创建表 ${table.name} 失败:`, err?.message || err);
    }
  }

  // --sync：额外用 prisma db push 同步字段结构（加列 / 改类型），
  // 只在人工明确需要时执行，不放进定时任务。
  if (needSync) {
    console.log('[ensure-tables] 开始执行 prisma db push 同步字段结构...');
    try {
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
      console.log('[ensure-tables] ✅ 字段结构同步完成');
    } catch (err: any) {
      console.error('[ensure-tables] ❌ prisma db push 执行失败:', err?.message || err);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  await prisma.$disconnect();
  if (created > 0) {
    console.log(`[ensure-tables] 完成，本次新建 ${created} 张表`);
  } else {
    console.log('[ensure-tables] 完成，未创建新表');
  }
  process.exit(0);
}

main().catch(async err => {
  console.error('[ensure-tables] 执行异常:', err);
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
