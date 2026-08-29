FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /repo
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm --filter @ga/web build

FROM base AS runner
WORKDIR /repo/apps/web
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web/node_modules ./node_modules
COPY --from=build /repo/apps/web/.next ./.next
COPY --from=build /repo/apps/web/package.json ./package.json
COPY --from=build /repo/apps/web/next.config.js ./next.config.js

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
