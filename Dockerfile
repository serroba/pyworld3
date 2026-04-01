FROM node:22-alpine

WORKDIR /app

COPY app/static/package.json app/static/package-lock.json app/static/
RUN cd app/static && npm ci --ignore-scripts

COPY app/static/ app/static/
RUN cd app/static && npm run build

EXPOSE 8000

CMD ["node", "app/static/js/cli/static-server.js", "--host", "0.0.0.0", "--port", "8000"]
