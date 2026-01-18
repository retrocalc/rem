# Use Node.js 20 Alpine as base image
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies only
RUN npm ci

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create data and logs directories
RUN mkdir -p data && mkdir -p logs

# Expose port
EXPOSE ${PORT:-3001}

# Define environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/main.js"]