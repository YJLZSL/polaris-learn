# ===== Stage 1: Build =====
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm (faster and more efficient)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manager files first for better layer caching
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
RUN pnpm build

# ===== Stage 2: Production =====
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy only necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema for runtime generate
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm install --prod --frozen-lockfile

# Generate Prisma client at runtime
RUN npx prisma generate

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/auth/health || exit 1

# Switch to non-root user
USER nextjs

# Start the application
CMD ["node", "server.js"]
