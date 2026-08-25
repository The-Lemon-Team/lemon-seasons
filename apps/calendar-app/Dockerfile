# Production Dockerfile for Calendar App (Vite + Nginx)
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/calendar-app/package.json ./apps/calendar-app/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/tsconfig ./packages/tsconfig
COPY apps/calendar-app ./apps/calendar-app

RUN pnpm --filter @lenta/shared run build
RUN pnpm --filter @lenta/calendar-app run build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/calendar-app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
