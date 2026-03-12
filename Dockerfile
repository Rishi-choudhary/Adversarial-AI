# ThemeForge Dockerfile
# Multi-stage build for smaller production image

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy templates
COPY src/templates ./src/templates

# Create directories for output
RUN mkdir -p /app/tmp /app/output

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Default command
CMD ["node", "dist/converter/index.js"]
