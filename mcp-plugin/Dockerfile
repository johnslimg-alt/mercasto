# syntax=docker/dockerfile:1.7
FROM node:22-alpine

ENV NODE_ENV=production \
    MCP_BIND_HOST=0.0.0.0 \
    MCP_PORT=8780

WORKDIR /app

COPY package.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm install --omit=dev --ignore-scripts --no-audit --no-fund

COPY server.mjs ./

RUN chown -R node:node /app
USER node

EXPOSE 8780

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- --header='Host: 127.0.0.1' http://127.0.0.1:8780/healthz >/dev/null || exit 1

CMD ["node", "server.mjs"]
