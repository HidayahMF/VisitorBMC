FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci

COPY backend backend
RUN npm run build --workspace=backend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci --omit=dev && mkdir -p /app/uploads && chown -R node:node /app

COPY --from=build --chown=node:node /app/backend/dist /app/backend/dist
USER node
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
