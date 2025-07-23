FROM node:22-alpine

# Install pnpm and required tools
RUN apk add --no-cache bash git python3 make g++ && \
    npm install -g pnpm@10.13.1 turbo dotenvx tsx

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/bot/package.json ./apps/bot/
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/scripts/package.json ./packages/scripts/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/vitest-config/package.json ./packages/vitest-config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build all applications
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GUILD_ID
RUN pnpm turbo build

# Expose ports
EXPOSE ${WEB_PORT:-3000} ${API_PORT:-3001} ${BOT_PORT:-3002}

# Start all services
CMD ["bash", "-c", "\
  # Run database initialization if needed \
  if [ \"$DEV_DB_AUTO_SEED\" = \"true\" ] && [ \"$NODE_ENV\" = \"development\" ]; then \
    echo '🌱 Running database initialization and seeding...'; \
    pnpm db:push && pnpm db:seed; \
  fi; \
  \
  # Start all services concurrently \
  echo '🚀 Starting all services...'; \
  npx concurrently -n api,bot,web -c blue,green,cyan \
    'pnpm --filter @ticketsbot/api start' \
    'pnpm --filter @ticketsbot/bot start' \
    'pnpm --filter @ticketsbot/web start' \
"]