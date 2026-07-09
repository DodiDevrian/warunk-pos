# ==========================================
# Stage 1: Build the React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build the Node.js Backend
# ==========================================
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

# Install dependencies (including devDependencies for TypeScript build & tsx)
COPY backend/package*.json ./
RUN npm ci

# Copy source and build
COPY backend/ ./
RUN npm run build

# ==========================================
# Stage 3: Runtime Environment
# ==========================================
FROM node:20-alpine AS runtime

# Install Nginx and tzdata (for timezone support)
RUN apk add --no-cache nginx tzdata && \
    mkdir -p /run/nginx

# Set working directory
WORKDIR /app

# Copy built frontend assets to Nginx html directory
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy backend files needed for execution (including src/ for tsx migration/seed scripts)
COPY --from=backend-builder /app/backend/package*.json /app/backend/
COPY --from=backend-builder /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/backend/dist /app/backend/dist
COPY --from=backend-builder /app/backend/src /app/backend/src

# Create folders for uploads and data (SQLite), set permissions
RUN mkdir -p /app/backend/uploads /app/backend/data && \
    chown -R node:node /app/backend

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy startup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose Nginx port
EXPOSE 80

# Environment variables
ENV PORT=4000
ENV NODE_ENV=production
ENV DATABASE_URL=/app/backend/data/warunk.db
ENV CLIENT_URL=http://localhost

# Expose database and uploads for persistence
VOLUME [ "/app/backend/data", "/app/backend/uploads" ]

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
