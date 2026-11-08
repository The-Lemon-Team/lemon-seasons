# Multi-stage Lightweight Production Dockerfile for NestJS Backend on Fly.io
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/lemon-bus/package.json ./packages/lemon-bus/
COPY packages/seasons-neurons/package.json ./packages/seasons-neurons/
COPY apps/backend/prisma/schema.prisma ./apps/backend/prisma/schema.prisma

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/tsconfig ./packages/tsconfig
COPY packages/lemon-bus ./packages/lemon-bus
COPY packages/seasons-neurons ./packages/seasons-neurons
COPY apps/backend ./apps/backend

RUN pnpm --filter @lenta/shared run build
RUN pnpm --filter @lenta/lemon-bus run build
RUN pnpm --filter @lenta/seasons-neurons run build
RUN pnpm --filter lemon-lenta-backend run prisma:generate
RUN pnpm --filter lemon-lenta-backend run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV NODE_PATH=/app/node_modules:/app/apps/backend/node_modules

COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/lemon-bus/package.json ./packages/lemon-bus/package.json
COPY --from=builder /app/packages/lemon-bus/dist ./packages/lemon-bus/dist
COPY --from=builder /app/packages/seasons-neurons/package.json ./packages/seasons-neurons/package.json
COPY --from=builder /app/packages/seasons-neurons/dist ./packages/seasons-neurons/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

EXPOSE 8080
CMD ["node", "dist/main.js"]
