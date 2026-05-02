FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/application/package.json packages/application/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/application packages/application
COPY apps/api apps/api
RUN pnpm --filter @mock-stack/application run build
RUN pnpm --filter @mock-stack/api run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/application/package.json packages/application/package.json
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/application/dist packages/application/dist
EXPOSE 8787
CMD ["node", "apps/api/dist/server.js"]
