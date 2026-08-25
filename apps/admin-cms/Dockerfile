# Production Dockerfile for Admin CMS (Vite + Nginx)
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin-cms/package.json ./apps/admin-cms/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/tsconfig ./packages/tsconfig
COPY apps/admin-cms ./apps/admin-cms

RUN pnpm --filter @lenta/shared run build
RUN pnpm --filter lemon-seasons-admin run build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/admin-cms/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
