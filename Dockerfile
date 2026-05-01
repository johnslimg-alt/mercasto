# --- Этап сборки (Build Stage) ---
FROM node:22-alpine AS build

WORKDIR /app

# Копируем package.json/package-lock.json и устанавливаем зависимости воспроизводимо.
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Копируем остальные файлы и собираем production-версию
COPY . .
RUN npm run build

# --- Этап раздачи (Serve Stage) ---
FROM nginx:stable-alpine

# Копируем собранные статические файлы из этапа сборки
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
