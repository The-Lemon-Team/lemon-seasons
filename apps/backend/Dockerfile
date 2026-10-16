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
COPY apps/backend/prisma ./apps/backend/prisma

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/tsconfig ./packages/tsconfig
COPY apps/backend ./apps/backend

RUN pnpm --filter @lenta/shared run build || test -d packages/shared/dist
RUN pnpm --filter lemon-lenta-backend run prisma:generate
RUN pnpm --filter lemon-lenta-backend run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_PATH=/app/node_modules:/app/apps/backend/node_modules

COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

EXPOSE 3001
CMD ["node", "dist/src/main.js"]
