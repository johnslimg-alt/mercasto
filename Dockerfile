# --- Этап сборки (Build Stage) ---
FROM node:18-alpine as build

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем остальные файлы и собираем production-версию
COPY . .
RUN npm run build

# --- Этап раздачи (Serve Stage) ---
FROM nginx:stable-alpine

# Копируем собранные статические файлы из этапа сборки
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80