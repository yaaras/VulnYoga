FROM node:20-alpine

# Add security warning
LABEL description="VulnYoga - Vulnerable-by-Design Yoga Store API for security testing"

# Create app directory
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create necessary directories
RUN mkdir -p logs public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Create startup script
RUN echo '#!/bin/sh\n\
if [ ! -f /app/yogastore.db ]; then\n\
  echo "Initializing database..."\n\
  npx prisma db push\n\
  npm run seed\n\
fi\n\
echo "Starting VulnYoga..."\n\
npm start' > /app/start.sh && chmod +x /app/start.sh

# Start the application
CMD ["/app/start.sh"]
