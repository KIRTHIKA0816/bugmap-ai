# One container serves both the API and the built React app on one URL.
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV APP_ENV=production PYTHONUNBUFFERED=1
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=web /web/dist /app/static_site
ENV FRONTEND_DIST=/app/static_site
RUN useradd -m app && chown -R app /app
USER app
EXPOSE 10000
CMD ["sh", "-c", "gunicorn -w 1 --threads 4 --timeout 60 -b 0.0.0.0:${PORT:-10000} app:app"]
