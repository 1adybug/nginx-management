# syntax=docker.io/docker/dockerfile:1

FROM node:lts-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends -o Acquire::Retries=3 openssl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json ./
RUN npm install --registry=https://registry.npmmirror.com

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone
# 临时的环境变量，仅用于 build 阶段跳过
ENV BETTER_AUTH_SECRET=7a4d08aa943c38b646d15d6398f013bcab9147f009474be97500262142cf18ad
ENV BETTER_AUTH_URL=http://example.com
ENV DEFAULT_EMAIL_DOMAIN=example.com

RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends -o Acquire::Retries=3 gosu nginx libcap2-bin \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --gid 1001 nodejs
RUN useradd --uid 1001 --gid nodejs --create-home nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=deps /app/node_modules/prisma/package.json ./prisma-package.json
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
RUN setcap "cap_net_bind_service=+ep" /usr/sbin/nginx

RUN npm install -g "prisma@$(node -p "require('./prisma-package.json').version")" --registry=https://registry.npmmirror.com \
    && rm ./prisma-package.json

# 创建启动脚本，先以 root 执行 prisma migrate deploy，然后切换用户运行应用
RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -e' \
    'mkdir -p /app/data/nginx/conf.d /app/data/nginx/stream.d /app/data/nginx/certs /app/data/nginx/tmp/client_body /app/data/nginx/tmp/proxy /app/data/nginx/tmp/fastcgi /app/data/nginx/tmp/uwsgi /app/data/nginx/tmp/scgi' \
    'chown -R nextjs:nodejs /app/data' \
    'chmod -R u+rwX,g+rwX /app/data' \
    'if [ ! -f /app/data/nginx/nginx.conf ]; then' \
    'cat > /app/data/nginx/nginx.conf <<'"'"'EOF'"'"'' \
    'include /etc/nginx/modules-enabled/*.conf;' \
    'pid /app/data/nginx/nginx.pid;' \
    'error_log /dev/stderr warn;' \
    '' \
    'events {' \
    '    worker_connections 1024;' \
    '}' \
    '' \
    'http {' \
    '    include /etc/nginx/mime.types;' \
    '    default_type application/octet-stream;' \
    '    access_log /dev/stdout;' \
    '    sendfile on;' \
    '    keepalive_timeout 65;' \
    '    client_body_temp_path /app/data/nginx/tmp/client_body;' \
    '    proxy_temp_path /app/data/nginx/tmp/proxy;' \
    '    fastcgi_temp_path /app/data/nginx/tmp/fastcgi;' \
    '    uwsgi_temp_path /app/data/nginx/tmp/uwsgi;' \
    '    scgi_temp_path /app/data/nginx/tmp/scgi;' \
    '' \
    '    map $http_upgrade $connection_upgrade {' \
    '        default upgrade;' \
    '        "" close;' \
    '    }' \
    '' \
    '    include /app/data/nginx/conf.d/*.conf;' \
    '}' \
    '' \
    'stream {' \
    '    include /app/data/nginx/stream.d/*.conf;' \
    '}' \
    'EOF' \
    'fi' \
    'chown -R nextjs:nodejs /app/data' \
    'chmod -R u+rwX,g+rwX /app/data' \
    'touch /app/data/production.db' \
    'prisma migrate deploy' \
    'case "${NGINX_PROXY_APPLY_ENABLED:-1}" in' \
    '    0|false|FALSE|off|OFF|no|NO)' \
    '        ;;' \
    '    *)' \
    '        gosu nextjs nginx -c /app/data/nginx/nginx.conf' \
    '        ;;' \
    'esac' \
    'exec gosu nextjs node server.js' \
    > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 80 443 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"

# 以 root 启动，脚本内部会修复权限并降权
CMD ["/app/entrypoint.sh"]
