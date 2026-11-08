# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

WORKDIR /build

# Copy only what is needed for building lemon-bus
COPY packages/lemon-bus/package.json ./
COPY packages/lemon-bus/tsconfig.json ./
COPY packages/lemon-bus/tsup.config.ts ./
COPY packages/lemon-bus/src ./src

# Install dependencies and compile bundle
RUN npm install
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV LEMON_BUS_DB_PATH=/data/lemon-bus.db

# Ensure persistent volume mount directory exists
RUN mkdir -p /data

# Copy built server from builder
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./package.json

EXPOSE 8080

CMD ["node", "--experimental-sqlite", "dist/server/index.js"]
