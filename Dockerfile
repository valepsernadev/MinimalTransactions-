FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci --omit=dev
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/web/dist ./web/dist
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
