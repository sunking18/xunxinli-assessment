# 寻心理测评平台 - 后端镜像
FROM node:20-alpine AS builder
WORKDIR /app

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

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx prisma db seed && node dist/index.js"]
