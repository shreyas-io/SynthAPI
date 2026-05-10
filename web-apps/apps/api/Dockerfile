FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/agent-orchestration-engine/package.json packages/agent-orchestration-engine/package.json
COPY packages/mockapi-engine/package.json packages/mockapi-engine/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/agent-orchestration-engine packages/agent-orchestration-engine
COPY packages/mockapi-engine packages/mockapi-engine
COPY apps/api apps/api
RUN pnpm --filter @mock-stack/agent-orchestration-engine run build
RUN pnpm --filter @mock-stack/mockapi-engine run build
RUN pnpm --filter @mock-stack/api run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/agent-orchestration-engine/package.json packages/agent-orchestration-engine/package.json
COPY packages/mockapi-engine/package.json packages/mockapi-engine/package.json
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/agent-orchestration-engine/dist packages/agent-orchestration-engine/dist
COPY --from=build /app/packages/mockapi-engine/dist packages/mockapi-engine/dist
EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
