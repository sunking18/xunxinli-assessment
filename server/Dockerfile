# 寻心理测评平台 - 后端镜像
FROM node:20-alpine AS builder
WORKDIR /app

# Alpine 下 Prisma 需要 OpenSSL 才能加载查询引擎
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache openssl

# 安装依赖（含 prisma 生成客户端所需）
COPY package*.json ./
RUN npm install

# 生成 Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# 复制源码并构建
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# ---------- 运行阶段 ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# 运行阶段同样需要 OpenSSL 才能使用 Prisma 引擎
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache openssl

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3001
#
# 启动即服务，不做任何建表动作。
# 原因：之前是 `prisma db push && node dist/index.js`，把「建表」和「启动服务」绑在一起，
# 一旦 db push 慢 / 失败 / 卡在交互确认，node 就永远起不来，全站 /api 502。
# 现在两者彻底分离：
#   - 服务启动：只跑 node（本行）
#   - 建表补表：单独执行 `node dist/scripts/ensureTables.js`（幂等，缺失才建）
#              需要同步字段时再加 --sync（内部调用 prisma db push）
# 业务数据（测评定义/题目/报告模板）仍由 initdb/*.sql 初始化，不执行 seed。
CMD ["node", "dist/index.js"]
