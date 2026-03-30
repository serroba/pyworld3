FROM node:22-alpine

WORKDIR /app

COPY app/static/ app/static/

EXPOSE 8000

CMD ["node", "app/static/js/cli/static-server.js", "--host", "0.0.0.0", "--port", "8000"]
