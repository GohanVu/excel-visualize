FROM node:20.14-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# ── Dev stage: hot reload, tất cả deps ─────────────────────────────────────
FROM base AS dev
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install
COPY . .
CMD ["pnpm", "start:dev"]

# ── Build stage ─────────────────────────────────────────────────────────────
FROM base AS build
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ── Production stage: chỉ runtime deps ─────────────────────────────────────
FROM node:20.14-alpine AS prod
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
