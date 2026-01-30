# Use a base image with full Debian (Bookworm) to easily install libraries
FROM node:20-bookworm-slim

# Set Puppeteer env vars EARLY so they are available during install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Config for better-sqlite3 build
ENV PYTHON=/usr/bin/python3

# Install system dependencies for Puppeteer & Native Modules
RUN apt-get update && apt-get install -y \
    chromium \
    build-essential \
    python3 \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Persistence setup
RUN mkdir -p /data
ENV DATA_DIR="/data"

# Dependency installation
COPY package.json package-lock.json* ./

# Install ALL dependencies (FORCE include dev deps even if NODE_ENV=production)
# We need devDeps (tsx, vite) for runtime and build
RUN npm ci --include=dev

# Copy app source
COPY . .

# Build frontend/types
RUN npm run build --if-present

# NOTE: We do NOT prune dev dependencies because we run the server with 'tsx' (a dev dependency)
# If we pruned, 'npm run server' would fail.

# Runtime Env Vars
ENV NODE_ENV=production
ENV PORT=10000

# Ensure database directory exists (if using relative paths fallback)
RUN mkdir -p /app/server/data

# Use 'npm run server' strictly to avoid re-triggering 'npm run build' (which is in 'npm start')
CMD ["npm", "run", "server"]
