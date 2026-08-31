#!/usr/bin/env bash
# 寻心理测评平台 - 一键部署脚本
# 用法（服务器执行）：cd /data/q.xunxinli && bash deploy.sh
#
# 数据库变更策略：
#   1. 表结构变更统一走 prisma/migrations/ 下的版本化迁移文件
#   2. migrate deploy 只应用「尚未执行过」的迁移，已执行的自动跳过（幂等）
#   3. 首次引入或全新部署时，自动把 baseline(0_init) 标记为已应用
#      （因为表结构已由 initdb/*.sql 建好，不能重复执行建表语句）
#   4. 服务启动命令本身不碰数据库，日常 restart 不受任何影响
#
# 部署纪律：
#   加字段/加表 → 先迁移数据库，再部署代码（本脚本已保证该顺序）
#   删字段/改字段名 → 必须先改代码不再依赖该字段，下次部署再删字段
set -e

cd "$(dirname "$0")"

MYSQL_USER="${MYSQL_USER:-q_xunxinli}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-xunxinli123}"
DB_NAME="q_xunxinli"

echo "===== 1/5 拉取代码 ====="
git pull

echo "===== 2/5 构建并启动后端 ====="
docker compose up -d --build server

echo -n "等待后端就绪"
READY=0
for _ in $(seq 1 30); do
  if curl -fs -m 3 "http://127.0.0.1:3011/api/health" >/dev/null 2>&1; then
    READY=1
    echo " OK"
    break
  fi
  echo -n "."
  sleep 2
done
if [ "$READY" -ne 1 ]; then
  echo " 后端启动超时，请检查：docker compose logs --tail=50 server"
  exit 1
fi

echo "===== 3/5 应用数据库迁移 ====="
HAS_MIGRATION_TABLE=$(docker compose exec -T mysql mysql -N -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" \
  -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='_prisma_migrations';" 2>/dev/null | tr -d '\r\n ' || true)

APPLIED_COUNT=0
if [ "$HAS_MIGRATION_TABLE" = "1" ]; then
  APPLIED_COUNT=$(docker compose exec -T mysql mysql -N -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" \
    -e "SELECT COUNT(*) FROM _prisma_migrations;" 2>/dev/null | tr -d '\r\n ' || true)
fi

if [ -z "$APPLIED_COUNT" ] || [ "$APPLIED_COUNT" = "0" ]; then
  echo "首次引入迁移（或全新部署），将 baseline 标记为已应用..."
  docker compose exec -T server npx prisma migrate resolve --applied 0_init
fi

docker compose exec -T server npx prisma migrate deploy

echo "===== 4/5 巡检补表（安全网，缺失才建）====="
docker compose exec -T server node dist/scripts/ensureTables.js

echo "===== 5/5 构建前端与健康检查 ====="
docker compose up -d --build client
sleep 5
curl -s -m 5 -o /dev/null -w "后端健康检查: HTTP %{http_code}\n" http://127.0.0.1:3011/api/health
docker compose ps
echo "部署完成"
