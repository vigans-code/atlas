FROM node:22-bookworm-slim

WORKDIR /app

RUN mkdir -p /home/node/.cache && chown node:node /app /home/node/.cache

USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
