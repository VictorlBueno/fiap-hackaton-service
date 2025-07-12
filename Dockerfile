FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

RUN npm ci

COPY src/ ./src/

RUN npm run build

FROM node:18-alpine AS production

RUN apk add --no-cache dumb-init ffmpeg

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps && npm cache clean --force

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

COPY --chown=nestjs:nodejs nest-cli.json ./

RUN mkdir -p uploads outputs temp && chown -R nestjs:nodejs uploads outputs temp

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health.js || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/infrastructure/http/main"] 