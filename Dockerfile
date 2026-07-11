# syntax=docker/dockerfile:1.7
# --- Этап сборки (Build Stage) ---
FROM node:22-alpine AS build

WORKDIR /app

# Public analytics identifiers must exist while Vite builds the frontend bundle.
# They can still be overridden with Docker build args when needed.
ARG VITE_ANALYTICS_ENABLED=true
ARG VITE_META_PIXEL_ID=4595315270748335
ENV VITE_ANALYTICS_ENABLED=${VITE_ANALYTICS_ENABLED}
ENV VITE_META_PIXEL_ID=${VITE_META_PIXEL_ID}

# Копируем package.json/package-lock.json и устанавливаем зависимости воспроизводимо.
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Копируем остальные файлы и собираем production-версию
COPY . .
RUN npm run build

# Fail the image build if the production bundle silently loses Meta Pixel again.
# Use BusyBox-compatible short grep flags because the build image is Alpine.
RUN grep -R -F "4595315270748335" /app/dist/assets >/dev/null \
    && grep -R -F "connect.facebook.net/en_US/fbevents.js" /app/dist/assets >/dev/null

# --- Этап раздачи (Serve Stage) ---
FROM nginx:stable-alpine

# Копируем собранные статические файлы из этапа сборки
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
