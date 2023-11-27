FROM node:21-alpine as builder

ENV NODE_ENV build

RUN mkdir -p /app
RUN chown node /app

USER node
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build \
    && npm prune --production

# ---

FROM node:21-alpine

ENV NODE_ENV production

RUN mkdir -p /app
RUN chown node /app

USER node
WORKDIR /app

COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /app/dist/ ./dist/

CMD ["node", "dist/main.js"]