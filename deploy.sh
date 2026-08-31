#!/usr/bin/env bash
# 寻心理测评平台 - 一键部署脚本
# 用法（服务器执行）：cd /data/q.xunxinli && bash deploy.sh
#
# 数据库行为边界（重要）：
#   ✅ 自动：检测到「缺失的表」会直接建表（CREATE TABLE IF NOT EXISTS，不影响已有数据）
#   ❌ 不自动：任何修改已有表结构的动作（ALTER TABLE / 加列 / 改类型 / 删列）
#              一律人工确认后执行，方式见 server/prisma/migrations/README.md
#
# 流程：拉代码 → 构建 → 补建缺失的表 → 健康检查
set -e

cd "$(dirname "$0")"

echo "===== 1/4 拉取代码 ====="
git pull

echo "===== 2/4 构建并启动后端 ====="
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

echo "===== 3/4 构建前端 ====="
docker compose up -d --build client
sleep 5

echo "===== 4/4 补建缺失的数据表（只建表，不改已有表）与健康检查 ====="
echo "--- 表检查与补建 ---"
if docker compose exec -T server node dist/scripts/ensureTables.js; then
  echo "✅ 数据表检查完成"
else
  echo "⚠️  建表检查执行失败（可能是数据库连接问题），请检查："
  echo "    docker compose logs --tail=30 server"
fi

echo "--- 健康检查 ---"
curl -s -m 5 -o /dev/null -w "后端健康检查: HTTP %{http_code}\n" http://127.0.0.1:3011/api/health
docker compose ps
echo "部署完成"
