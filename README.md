# 寻心理测评平台 (XunXinLi Assessment Platform)

专业的心理测评网站，支持多套经典测评（MBTI / 大五人格 / DISC / 性格色彩 / SBTI / 霍兰德），作答完成后自动生成个性化分析报告，并提供管理后台进行测评与答卷管理。

- 线上域名：`q.xunxinli.com`（测评英文取 `q`，区别于 survey 问卷站）
- 技术栈：React 18 + Vite + Tailwind CSS / Node.js + Express / Prisma + MySQL / Docker
- 部署方式：Docker Compose（MySQL + 后端 API + 前端 Nginx）

## ✨ 核心设计：统一表结构

所有测评共用一张 `assessments` 表、所有答卷共用一张 `responses` 表：

| 表 | 说明 |
|----|------|
| `users` | 管理员账号（JWT 认证） |
| `assessments` | 统一测评表：`code` 唯一标识（如 `mbti`），题目 / 维度 / 报告模板均以 JSON 存储 |
| `responses` | 统一答卷表：通过 `assessmentId` 关联测评，答案 / 得分 / 个性化报告均以 JSON 存储 |

**优势**：新增测评无需新建数据表，只需插入一条记录；所有答卷按 `assessmentId` 过滤查询，资源占用小、结构清晰。

## 📁 目录结构

```
xunxinli-assessment/
├── docker-compose.yml          # Docker 编排（mysql + server + client）
├── server/                     # 后端 Node.js + Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma       # MySQL 统一表结构
│   │   ├── seed.ts             # 种子数据（6 测评 + 管理员）
│   │   └── reportTemplates.ts  # 各结果类型的报告模板
│   └── src/
│       ├── routes/             # auth / public(公开测评) / admin / wechat
│       └── services/           # scoring 计分 / reportService 报告生成
└── client/                     # 前端 React + Vite + Tailwind
    └── src/pages/              # 首页 / 答题 / 报告 / 管理后台
```

## 🚀 本地开发

### 前置要求
- Node.js 18+
- MySQL 8.0（本地运行）

### 步骤

```bash
# 1. 初始化数据库（root 密码按需修改）
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS xunxinli CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env 中的 DATABASE_URL

# 3. 安装依赖
npm run install:all

# 4. 建表 + 写入种子数据（6 个测评 + 管理员）
cd server
npx prisma db push
npx prisma db seed

# 5. 启动前后端
cd ..
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001
- 管理后台：http://localhost:5173/admin/login（默认账号 `admin` / `admin123`）

## 🐳 Docker 部署（服务器）

> 域名：`q.xunxinli.com`。服务器上已有其他站点/ nginx 占用 80/443，因此：
> - 容器内部服务：MySQL(3306) / 后端(3001) / 前端 Nginx(80)
> - 仅前端容器映射到宿主机回环 `127.0.0.1:8080`
> - **宿主机现有 nginx 负责 80/443 + 腾讯云 SSL 证书，反代到 `127.0.0.1:8080`**
> - 数据库用 compose 自带 MySQL 容器（数据存 volume `mysql_data`）

```bash
# 1. 克隆代码到服务器（与现有站点目录分离）
mkdir -p /opt/xunxinli && cd /opt/xunxinli
git clone <你的仓库地址> .

# 2. 配置环境变量（务必修改 JWT_SECRET、数据库密码）
cp .env.example .env
vim .env   # 修改 MYSQL_PASSWORD / JWT_SECRET / WECHAT_* 等

# 3. 构建并启动（前端容器监听宿主机 127.0.0.1:8080）
docker compose up -d --build

# 4. 验证容器状态
docker compose ps
curl -fsS http://127.0.0.1:8080/api/health && echo " 前端+后端 OK"
```

### 宿主机 Nginx 反代配置（腾讯云 SSL 证书）

将腾讯云下载的证书（含 `q.xunxinli.com_bundle.crt` 与 `q.xunxinli.com.key`）放到
`/etc/nginx/ssl/q.xunxinli.com/` 下，新增站点配置 `/etc/nginx/conf.d/q.xunxinli.com.conf`：

```nginx
server {
    listen 80;
    server_name q.xunxinli.com;
    # 80 端口统一跳转到 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name q.xunxinli.com;

    ssl_certificate     /etc/nginx/ssl/q.xunxinli.com/q.xunxinli.com_bundle.crt;
    ssl_certificate_key /etc/nginx/ssl/q.xunxinli.com/q.xunxinli.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;

    # 静态资源 / SPA 路由（转发到前端容器 8080）
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 同样反代到前端容器（前端 Nginx 已反代 /api 到后端 3001）
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

配置完成后 `nginx -t && nginx -s reload`。

## 📱 二维码与微信扫码

- 管理后台 → 测评管理 → 每个测评的「二维码」按钮，可生成测评链接二维码。
- 扫码后通过浏览器访问 `/fill/{code}` 答题。
- **微信授权**：生产环境在 `.env` 中配置 `WECHAT_APP_ID` / `WECHAT_APP_SECRET` 后，将微信网页授权回调域名设为 `q.xunxinli.com`，并配置回调路径 `/api/wechat/oauth/callback`，扫码进入测评页时将自动获取微信 openid / 昵称 / 头像（存于答卷 `wechatInfo` 字段）。
- **本地测试**：`.env` 中 `DEV_SKIP_WECHAT=true` 跳过微信授权，直接答题，不影响功能验证。

## 🔐 管理后台功能

- 数据概览：测评数、答卷数、分类分布、最新答卷
- 测评管理：增删改查测评，设置状态（发布/草稿/关闭），生成二维码，在线预览
- 答卷管理：查看逐题答案、维度得分、个性化报告，导出 CSV，删除答卷

## 🔄 Git 部署流程

```bash
# 本地（本仓库独立于 questionnaire-hub，全新 git 仓库）
git init
git add .
git commit -m "feat: 寻心理测评平台初版"
git remote add origin <你的新仓库地址>
git push -u origin main

# 服务器
cd /opt/xunxinli && git pull
docker compose up -d --build
```

## ⚠️ 免责声明

本平台测评结果仅供参考，不构成医疗诊断或心理治疗建议。如有心理困扰请及时寻求专业帮助。
