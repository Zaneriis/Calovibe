FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY web/package.json web/package.json
COPY mcp/package.json mcp/package.json
RUN npm ci --ignore-scripts --workspace @calovibe/mcp --include-workspace-root=true
COPY shared/contracts/ shared/contracts/
COPY scripts/build-contracts.cjs scripts/build-contracts.cjs
COPY mcp/build.cjs mcp/tsconfig.json mcp/
COPY mcp/src/ mcp/src/
RUN npm run build --workspace @calovibe/mcp

FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS runtime
ARG APP_VERSION
RUN test "$(printf %s "$APP_VERSION" | wc -c)" -eq 40 && ! printf %s "$APP_VERSION" | grep -q '[^a-f0-9]'
ENV NODE_ENV=production APP_VERSION=$APP_VERSION MCP_HOST=0.0.0.0 MCP_PORT=3002
LABEL org.opencontainers.image.revision=$APP_VERSION
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY web/package.json web/package.json
COPY mcp/package.json mcp/package.json
RUN npm ci --ignore-scripts --omit=dev --workspace @calovibe/mcp --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/mcp/dist/ mcp/dist/
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["node", "--input-type=module", "-e", "const r=await fetch('http://127.0.0.1:'+process.env.MCP_PORT+'/health/ready',{signal:AbortSignal.timeout(4500)});process.exit(r.ok?0:1)"]
CMD ["node", "mcp/dist/main.js"]
