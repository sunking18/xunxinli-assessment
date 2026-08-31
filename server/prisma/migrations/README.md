# 数据库结构变更说明

## 核心原则

自动化的边界很明确：

| 动作 | 是否自动 | 说明 |
|---|---|---|
| **建缺失的表** | ✅ 自动 | `deploy.sh` 会调用 `ensureTables.js`，全部是 `CREATE TABLE IF NOT EXISTS`，不影响任何已有数据 |
| **改已有表结构**（加列/改类型/删列/加索引） | ❌ 人工 | 涉及数据迁移决策，必须人工审查后执行 |

`deploy.sh` 流程：拉代码 → 构建 → 补建缺失的表 → 健康检查。

## 为什么改表不让工具自动做

- 自动同步（`db push` / auto-migrate）会自己算 diff 并执行，可能在无人审查的情况下删列、截断数据
- 结构变更往往伴随数据迁移决策（旧数据填什么、要不要备份），工具猜不出来
- 人工执行 = 看得见、能回滚、时机可控

## 需要改表结构时：三种方式

### 方式 A：工具生成 SQL，你审查后手动执行（推荐）

好处：基于线上库**真实结构**做 diff，不会漏也不会错；但执行权始终在你手上。

```bash
cd server

# 1. 修改 prisma/schema.prisma

# 2. 生成「线上库 → 新 schema」的差异 SQL（只读操作，不会改库）
npx prisma migrate diff \
  --from-url "mysql://q_xunxinli:密码@服务器IP:3307/q_xunxinli" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/migration.sql

# 3. 人工审查：重点看有没有 DROP COLUMN / 缩短字段长度 / 改字段类型
cat /tmp/migration.sql

# 4. 确认无误后，把 SQL 传到服务器手动执行
docker compose exec -T mysql mysql \
  -u"${MYSQL_USER:-q_xunxinli}" -p"${MYSQL_PASSWORD:-xunxinli123}" q_xunxinli < /tmp/migration.sql
```

如果 diff 输出为空，说明线上结构已经和 schema 一致，什么都不用做。

### 方式 B：自己写 SQL 直接执行（简单变更）

```bash
# 进入数据库
docker compose exec -T mysql mysql \
  -u"${MYSQL_USER:-q_xunxinli}" -p"${MYSQL_PASSWORD:-xunxinli123}" q_xunxinli
```

```sql
-- 加字段
ALTER TABLE `Response` ADD COLUMN `source` VARCHAR(50) NULL;

-- 改字段类型（扩大长度安全，缩小会丢数据）
ALTER TABLE `Response` MODIFY COLUMN `userAgent` TEXT NULL;

-- 加索引
CREATE INDEX `Response_source_idx` ON `Response`(`source`);
```

### 方式 C：补建缺失的表（不碰任何已有表）

`deploy.sh` 部署时会自动做这件事，也可以手动触发：

```bash
# 补建缺失的表（幂等，已存在的直接跳过）
docker compose exec -T server node dist/scripts/ensureTables.js

# 只检查不建（返回 1 表示有表缺失）
docker compose exec -T server node dist/scripts/ensureTables.js --check
```

脚本里全部是 `CREATE TABLE IF NOT EXISTS`，**不会 ALTER 任何已存在的表**。

## 改结构前：先备份（必做）

```bash
docker compose exec -T mysql mysqldump \
  -u root -p"${MYSQL_ROOT_PASSWORD:-xunxinli_root_2026}" q_xunxinli \
  > /data/backup_xunxinli_$(date +%F_%H%M).sql

ls -lh /data/backup_xunxinli_*.sql
```

出问题时的回滚：

```bash
docker compose exec -T mysql mysql \
  -u"${MYSQL_USER:-q_xunxinli}" -p"${MYSQL_PASSWORD:-xunxinli123}" q_xunxinli \
  < /data/backup_xunxinli_20260831_1200.sql
```

## 部署纪律

| 变更类型 | 正确顺序 | 原因 |
|---|---|---|
| 加字段 / 加表 | 先改库，再部署代码 | 老代码不认识新字段，但不影响运行 |
| 删字段 / 改字段名 | **先部署不再依赖该字段的代码，下次再改库** | 否则老代码访问已删字段直接报错 |
| 改字段类型 | 确认不会截断数据 | 扩大长度安全，缩小长度会丢数据 |

## 关于 `0_init/migration.sql`

这是**当前完整结构的快照**，用途：

- 全新部署时参考（实际建表仍由 `initdb/*.sql` 完成）
- 需要时从中取用建表语句

**它不会被自动执行**，只是留档参考。

## 检查线上结构与 schema 是否一致

```bash
# 输出为空 = 完全一致
npx prisma migrate diff \
  --from-url "mysql://q_xunxinli:密码@服务器IP:3307/q_xunxinli" \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

建议每次部署前跑一次，有输出就说明需要人工处理。
