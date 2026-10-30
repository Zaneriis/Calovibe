FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY backend/package.json backend/package.json
COPY mcp/package.json mcp/package.json
RUN npm ci --ignore-scripts --workspace @calovibe/web --include-workspace-root=false
COPY web/ web/
RUN npm run build --workspace @calovibe/web

FROM node:24.22.1-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY backend/package.json backend/package.json
COPY mcp/package.json mcp/package.json
RUN npm ci --ignore-scripts --omit=dev --workspace @calovibe/web --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/web/dist ./web/dist
COPY web/server.cjs ./web/server.cjs
USER node
EXPOSE 4173
CMD ["node", "web/server.cjs"]
