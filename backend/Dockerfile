# Используем официальный образ PHP 8.2 с FPM
FROM php:8.2-fpm

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip

# Устанавливаем расширения PHP (добавили zip, pgsql)
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo_mysql pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip

# Устанавливаем и включаем расширение Redis
RUN pecl install redis \
    && docker-php-ext-enable redis

# Устанавливаем Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Устанавливаем рабочую директорию
WORKDIR /var/www

# Копируем файлы проекта
COPY . .

# Устанавливаем зависимости Composer
RUN composer install --no-dev --optimize-autoloader
