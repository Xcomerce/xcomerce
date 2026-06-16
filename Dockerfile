# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Accept build arguments for Supabase connection
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Convert build arguments to environment variables for Vite compiler
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy lockfile and package.json configurations of root and workspace projects
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the web application (outputs to apps/web/dist)
RUN npm run build -w web

# Stage 2: Serve
FROM nginx:alpine

# Copy built files from the builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Healthcheck: usar 127.0.0.1 — localhost resolve para [::1] e nginx escuta só em IPv4
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
