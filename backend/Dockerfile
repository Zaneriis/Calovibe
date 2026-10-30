FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci --ignore-scripts --workspace @calovibe/backend --include-workspace-root
COPY shared/contracts shared/contracts
COPY scripts/build-contracts.cjs scripts/build-contracts.cjs
COPY backend/src backend/src
COPY backend/build.cjs backend/tsconfig.json backend/
RUN npm run build --workspace @calovibe/backend

FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace @calovibe/backend

FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS runtime
ARG GIT_SHA
RUN node -e "if(!/^[a-f0-9]{40}$/.test(process.env.GIT_SHA||'')) process.exit(1)"
ENV NODE_ENV=production APP_VERSION=${GIT_SHA}
LABEL org.opencontainers.image.revision=${GIT_SHA}
WORKDIR /app/backend
COPY --from=dependencies /app/node_modules /app/node_modules
COPY backend/package.json ./package.json
COPY --from=build /app/backend/dist ./dist
COPY backend/migrations ./migrations
USER 1000:1000
EXPOSE 3000
STOPSIGNAL SIGTERM
CMD ["node", "dist/main.js"]

FROM runtime AS test-jwks
COPY backend/tests/jwks-server.cjs ./tests/jwks-server.cjs
CMD ["node", "tests/jwks-server.cjs"]
