FROM node:20-slim

WORKDIR /app

# Install deps first so this layer is cached unless package.json changes.
COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Downloads the exact Chromium build (+ OS libraries) that the installed
# Playwright version expects. Doing this at build time - rather than
# depending on a base image that happens to have a matching browser
# preinstalled - keeps the image correct as the playwright dependency
# version changes.
RUN npx playwright install --with-deps chromium

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "src/index.js"]
