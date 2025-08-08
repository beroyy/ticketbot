# Base stage with common dependencies
FROM node:22-alpine AS base
RUN apk add --no-cache bash git python3 make g++
RUN npm install -g pnpm@10.13.1 turbo tsx

FROM base AS deps
WORKDIR /app

COPY . .

ENV CI=true
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

COPY . .

RUN pnpm db:generate

RUN pnpm --filter @ticketsbot/web build

# Runner stage
FROM base AS runner
WORKDIR /app

COPY --from=builder /app .

EXPOSE 3000 3001 3002

ENV NODE_ENV=production

CMD ["pnpm", "start"]