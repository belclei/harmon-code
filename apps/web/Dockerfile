# apps/web/Dockerfile
# Build context is the repo root (npm workspaces monorepo) — apps/web
# depends on @lurem/ui, resolved via the workspace.
FROM node:20-alpine AS build

WORKDIR /app

# Vite bakes VITE_* vars into the bundle at build time, unlike the API's
# GOOGLE_CLIENT_ID which is read at container runtime — same value, has to
# reach the app via a build arg instead of just `environment:` in compose.
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace=@lurem/web

FROM nginx:1.27-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/ || exit 1
