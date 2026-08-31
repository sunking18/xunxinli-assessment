#!/usr/bin/env bash
# 寻心理测评平台 - 运维脚本
#
# 用法（服务器执行）：cd /data/q.xunxinli && bash deploy.sh [模式]
#
#   bash deploy.sh           完整部署：拉代码 → 构建 → 补表 → 健康检查（默认）
#   bash deploy.sh restart   仅重启服务：不拉代码、不构建镜像，几秒完成
#   bash deploy.sh check     仅体检：查数据库表 + 服务健康，不重启、不改任何东西
#
# 数据库行为边界（重要）：
#   ✅ 自动：检测到「缺失的表」会直接建表（CREATE TABLE IF NOT EXISTS，不影响已有数据）
#   ❌ 不自动：任何修改已有表结构的动作（ALTER TABLE / 加列 / 改类型 / 删列）
#              一律人工确认后执行，方式见 server/prisma/migrations/README.md
#
# 注：服务器断电/重启后无需手动操作，docker-compose.yml 里三个服务都是
#     restart: unless-stopped，Docker 会随系统自动拉起。

set -e
cd "$(dirname "$0")"

# 等待后端健康检查通过，最多等 60 秒
wait_backend() {
  echo -n "等待后端就绪"
  local i
  for i in $(seq 1 30); do
    if curl -fs -m 3 "http://127.0.0.1:3011/api/health" >/dev/null 2>&1; then
      echo " OK"
      return 0
    fi
    echo -n "."
    sleep 2
  done
  echo " 超时"
  return 1
}

# 数据库：只补建缺失的表，不会 ALTER 任何已有表
ensure_tables() {
  echo "--- 数据库表检查与补建（只建缺失的表，不改已有表）---"
  if docker compose exec -T server node dist/scripts/ensureTables.js; then
    echo "✅ 数据表检查完成"
  else
    echo "⚠️  建表检查执行失败（可能是数据库连接问题），请检查："
    echo "    docker compose logs --tail=30 server"
  fi
}

# 服务健康检查
health_check() {
  echo "--- 健康检查 ---"
  curl -s -m 5 -o /dev/null -w "后端健康检查: HTTP %{http_code}\n" http://127.0.0.1:3011/api/health
  docker compose ps
}

case "${1:-deploy}" in

  check)
    echo "===== 仅体检模式（不重启、不改任何东西）====="
    ensure_tables
    health_check
    ;;

  restart)
    echo "===== 仅重启服务（不拉代码、不构建镜像）====="
    docker compose restart server client
    if wait_backend; then
      health_check
      echo "重启完成"
    else
      echo "后端启动超时，请检查：docker compose logs --tail=50 server"
      exit 1
    fi
    ;;

  deploy|*)
    echo "===== 1/4 拉取代码 ====="
    git pull

    echo "===== 2/4 构建并启动后端 ====="
    docker compose up -d --build server
    if ! wait_backend; then
      echo "后端启动超时，请检查：docker compose logs --tail=50 server"
      exit 1
    fi

    echo "===== 3/4 构建前端 ====="
    docker compose up -d --build client
    sleep 5

    echo "===== 4/4 数据库补表与健康检查 ====="
    ensure_tables
    health_check
    echo "部署完成"
    ;;

esac
