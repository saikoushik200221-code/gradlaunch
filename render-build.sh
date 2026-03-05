#!/opt/render/project/src/.render/bin/bash
# Exit on error
set -o errexit

# Install root dependencies (if any)
npm install

# Install sub-project dependencies
npm run install:all

# Build the frontend
# This will output to backend/public as configured in vite.config.js
npm run build:frontend

# Install Playwright browsers for the scraper
npx playwright install --with-deps chromium
