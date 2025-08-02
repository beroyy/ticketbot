# Base stage with common dependencies
FROM node:22-alpine AS base
RUN apk add --no-cache bash git python3 make g++
RUN npm install -g pnpm@10.13.1 turbo tsx

# Dependencies stage - only package files
FROM base AS deps
WORKDIR /app

# Copy only package files for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/bot/package.json ./apps/bot/
COPY packages/core/package.json ./packages/core/
COPY packages/scripts/package.json ./packages/scripts/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/vitest-config/package.json ./packages/vitest-config/

# Install dependencies with frozen lockfile
ENV CI=true
RUN pnpm install --frozen-lockfile

# Builder stage - copy source and prepare runtime
FROM deps AS builder
WORKDIR /app

# Copy source code
COPY . .

# Note: We don't build here because Prisma needs runtime generation
# The start:production script handles this

# Runner stage - minimal production image
FROM base AS runner
WORKDIR /app

# Copy everything from builder
# (In future, could optimize to copy only needed files)
COPY --from=builder /app .

# Expose ports
EXPOSE ${API_PORT:-3001} ${BOT_PORT:-3002}

# Start services
CMD ["pnpm", "start:production"]