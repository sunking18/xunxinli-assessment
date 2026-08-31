#!/usr/bin/env bash
# 寻心理测评平台 - 一键部署脚本
# 用法（服务器执行）：cd /data/q.xunxinli && bash deploy.sh
#
# ⚠️ 重要：本脚本【不会修改任何数据库结构】。
# 部署只做：拉代码 → 构建 → 重启 → 检查表是否齐全（只读）→ 健康检查
#
# 表结构变更一律人工确认后执行，方式见 server/prisma/migrations/README.md：
#   docker compose exec -T server node dist/scripts/ensureTables.js   # 补建缺失的表
#   docker compose exec -T mysql mysql -u... -p... q_xunxinli          # 手动执行 ALTER/CREATE
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

echo "===== 4/4 表结构巡检（只读）与健康检查 ====="
echo "--- 表检查 ---"
if docker compose exec -T server node dist/scripts/ensureTables.js --check; then
  echo "✅ 所有数据表齐全"
else
  echo ""
  echo "⚠️  检测到缺失的数据表，部署继续，但相关功能会报错。"
  echo "    确认无误后，手动执行下面这条补建："
  echo "    docker compose exec -T server node dist/scripts/ensureTables.js"
  echo ""
fi

echo "--- 健康检查 ---"
curl -s -m 5 -o /dev/null -w "后端健康检查: HTTP %{http_code}\n" http://127.0.0.1:3011/api/health
docker compose ps
echo "部署完成"
