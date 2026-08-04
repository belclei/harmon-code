# apps/api/Dockerfile
# Build context is the repo root (npm workspaces monorepo) — packages/core,
# packages/db, packages/domain resolve to raw .ts source (see their
# package.json "main"), so tsx transpiles them at runtime just like `npm run
# dev` already does locally. No separate compile step, matching this
# project's "simplicidade de operação" principle (ARQUITETURA.md §7.x).
FROM node:20-alpine

# Prisma's engine detection needs a real OpenSSL on musl libc — without it,
# `prisma generate`/the client silently guess the wrong engine build
# (warns at build time, can fail to connect at runtime).
RUN apk add --no-cache openssl

WORKDIR /app

# Copy workspace manifests first for better layer caching — dependency
# install only re-runs when a package.json/lockfile actually changes.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY . .

RUN npm run generate --workspace=@lurem/db

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

CMD ["npm", "run", "start", "--workspace=@lurem/api"]
