# Используем официальный образ PHP 8.3 с FPM
FROM php:8.3-fpm

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
    && docker-php-ext-install pdo_mysql pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip opcache

# Устанавливаем и включаем расширение Redis
RUN pecl install redis \
    && docker-php-ext-enable redis

# Устанавливаем Composer v2.9.7
COPY --from=composer:2.9.7 /usr/bin/composer /usr/bin/composer

# Устанавливаем рабочую директорию
WORKDIR /var/www

# Копируем файлы проекта
COPY . .

# Устанавливаем зависимости Composer
RUN test -f composer.lock \
    && composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# Убираем искусственный bottleneck PHP-FPM под burst-нагрузкой дашборда и параллельных API-запросов.
RUN sed -i 's/^pm.max_children = .*/pm.max_children = 20/' /usr/local/etc/php-fpm.d/www.conf \
    && sed -i 's/^pm.start_servers = .*/pm.start_servers = 4/' /usr/local/etc/php-fpm.d/www.conf \
    && sed -i 's/^pm.min_spare_servers = .*/pm.min_spare_servers = 2/' /usr/local/etc/php-fpm.d/www.conf \
    && sed -i 's/^pm.max_spare_servers = .*/pm.max_spare_servers = 8/' /usr/local/etc/php-fpm.d/www.conf

# --- СУПЕР-ОПТИМИЗАЦИЯ PHP 8.3 ---
# Включаем OPcache и JIT (Just-In-Time) компиляцию для экстремального ускорения Laravel
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.jit_buffer_size=100M" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.jit=tracing" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini
