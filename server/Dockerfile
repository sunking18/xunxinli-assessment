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
# 注意：只建表（db push），不执行 db seed。
# 业务数据（测评定义、题目、报告模板等）统一由 initdb/*.sql 初始化，
# 避免 seed.ts 里的硬编码旧数据覆盖 SQL 导入的最新内容。
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
