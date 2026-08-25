# Multi-stage Production Dockerfile for NestJS Backend
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/tsconfig ./packages/tsconfig
COPY apps/backend ./apps/backend

RUN pnpm --filter @lenta/shared run build
RUN pnpm --filter lemon-lenta-backend run prisma:generate
RUN pnpm --filter lemon-lenta-backend run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
