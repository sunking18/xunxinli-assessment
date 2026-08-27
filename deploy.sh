#!/usr/bin/env bash
# 寻心理测评平台 - 服务器一键部署脚本
# 用法: ./deploy.sh
# 前置: 已在 /opt/xunxinli 下 git clone 本项目，并创建了 .env
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/xunxinli}"
cd "$DEPLOY_DIR"

echo "==> [1/4] 拉取最新代码"
git pull --ff-only

echo "==> [2/4] 构建并启动容器（前端监听 127.0.0.1:8080）"
docker compose up -d --build

echo "==> [3/4] 等待服务就绪"
for i in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
    echo "    健康检查通过"
    break
  fi
  sleep 3
done

echo "==> [4/4] 容器状态"
docker compose ps

echo ""
echo "部署完成。若首次部署或数据库为空，请在宿主机执行以下命令初始化："
echo "  docker compose exec server npx prisma migrate deploy   # 或 db push"
echo "  # 导入本地测试数据（可选）见 README"
echo ""
echo "别忘了：宿主机 nginx 已反代 q.xunxinli.com -> 127.0.0.1:8080，且已配置腾讯云 SSL 证书。"
