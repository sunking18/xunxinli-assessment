# 数据库迁移说明

表结构变更**统一走这里**，不要手动去线上库执行 `ALTER TABLE`。

## 目录结构

```
migrations/
├── 0_init/migration.sql              ← baseline：完整建表语句，只在全新部署时用
├── 20260831120000_add_xxx/migration.sql   ← 后续每次变更一个目录，按时间戳排序执行
└── README.md
```

`0_init` 是 baseline，建表语句已经由 `initdb/01-init-data.sql` 执行过，
所以部署脚本会把它标记为「已应用」而**不会真的执行**，后续只应用增量。

## 核心原理

- `prisma migrate deploy` 会读 `_prisma_migrations` 表，只执行**没执行过**的迁移，幂等
- Prisma Client 是根据 `schema.prisma` 生成的，**不是**根据真实数据库
  - schema 有、数据库没有 → 运行时报错（字段不存在）
  - 数据库有、schema 没有 → 不报错，但代码用不到
  - 所以：**改 schema 和改数据库必须成对提交**

## 日常改表流程

### 方式 A：本地能连数据库（推荐）

```bash
cd server

# 1. 修改 prisma/schema.prisma
# 2. 生成迁移文件并应用到本地库（会自动重新生成 Prisma Client）
npx prisma migrate dev --name add_response_source

# 3. 提交 schema + 迁移文件
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: 新增 xxx 字段"
```

### 方式 B：没有本地库，直接对线上生成差异 SQL

```bash
cd server

# 1. 修改 prisma/schema.prisma
# 2. 生成「线上库 → 新 schema」的差异（只读，不会改库）
npx prisma migrate diff \
  --from-url "mysql://q_xunxinli:密码@服务器IP:3307/q_xunxinli" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/migration.sql

# 3. 务必人工审查一遍 SQL（会不会丢数据、默认值合不合理）
cat /tmp/migration.sql

# 4. 保存为迁移文件
NAME=$(date +%Y%m%d%H%M%S)_add_xxx_field
mkdir -p prisma/migrations/$NAME
cp /tmp/migration.sql prisma/migrations/$NAME/migration.sql

# 5. 提交
git add prisma/schema.prisma prisma/migrations && git commit -m "feat: 新增 xxx 字段"
```

## 部署

```bash
cd /data/q.xunxinli && bash deploy.sh
```

脚本流程：`拉代码 → 构建启动后端 → 应用迁移 → 巡检补表 → 构建前端 → 健康检查`

## 部署纪律（重要）

| 变更类型 | 顺序 | 原因 |
|---|---|---|
| 加字段 / 加表 | 先迁移数据库，再部署代码 | 老代码不认识新字段但不影响运行 |
| 删字段 / 改字段名 | **先部署代码不再依赖该字段，下次部署再删字段** | 否则老代码访问已删字段会直接报错 |
| 字段改类型（如 varchar→text） | 直接迁移，注意确认不会截断数据 | 扩大长度安全，缩小长度会丢数据 |

## 禁止事项

- 不要手动在线上库 `ALTER TABLE`（会导致迁移历史与实际结构不一致，后续迁移失败）
- 不要用 `prisma db push` 同步生产库（它会做 diff 并可能删列，且不留记录）
- 不要修改已经执行过的迁移文件内容（只新增迁移，不改写历史）

## 出问题怎么办

迁移失败时 `migrate deploy` 会明确报错并停止部署，服务仍可正常访问（旧代码 + 旧结构）。

```bash
# 查看迁移状态
docker compose exec -T server npx prisma migrate status

# 查看失败的迁移
docker compose logs --tail=50 server
```
