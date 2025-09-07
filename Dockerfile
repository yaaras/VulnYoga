FROM node:20-alpine

# Add security warning
LABEL description="VulnYoga - Vulnerable-by-Design Yoga Store API for security testing"

# Create app directory
WORKDIR /app

# Install curl for healthcheck and OpenSSL for Prisma
RUN apk add --no-cache curl openssl

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Create necessary directories
RUN mkdir -p logs public

# Make startup script executable
RUN chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Start the application
CMD ["/app/start.sh"]
