# syntax=docker/dockerfile:1.7
FROM node:22-alpine

# pnpm via corepack — version matches the one pinned in web/package.json.
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Cache deps.
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source last.
COPY web/ ./

EXPOSE 5173
# Vite dev server: --host 0.0.0.0 so the LAN can reach it.
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
