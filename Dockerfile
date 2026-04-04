FROM node:22-alpine

WORKDIR /app

COPY app/package.json app/package-lock.json app/
RUN cd app && npm ci --ignore-scripts

COPY packages/core/src/ packages/core/src/
COPY scripts/sync-core.sh scripts/
COPY app/ app/
RUN cd app && npm run build

EXPOSE 8000

CMD ["node", "app/js/cli/static-server.js", "--host", "0.0.0.0", "--port", "8000"]
