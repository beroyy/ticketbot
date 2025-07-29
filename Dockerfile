FROM node:22-alpine

# Install pnpm and required tools
RUN apk add --no-cache bash git python3 make g++ && \
    npm install -g pnpm@10.13.1 turbo tsx

WORKDIR /app

# Set CI environment to skip postinstall during Docker build
ENV CI=true

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/bot/package.json ./apps/bot/
COPY packages/core/package.json ./packages/core/
COPY packages/scripts/package.json ./packages/scripts/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/vitest-config/package.json ./packages/vitest-config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Note: Prisma client generation moved to runtime to ensure it matches the database schema

# Expose ports for API and Bot
EXPOSE ${API_PORT:-3001} ${BOT_PORT:-3002}

# Start services using production startup script
CMD ["pnpm", "start:production"]