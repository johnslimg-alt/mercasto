# syntax=docker/dockerfile:1
# Используем официальный образ PHP 8.4 с FPM
FROM php:8.4-fpm

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Устанавливаем системные зависимости и расширения PHP одним слоем.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    libicu-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libwebp-dev \
    libfreetype6-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libpq-dev \
    ffmpeg \
    nodejs \
    npm \
    zip \
    unzip \
    ; \
    docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp; \
    docker-php-ext-install pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip opcache intl; \
    rm -rf /var/lib/apt/lists/*

# Устанавливаем и включаем расширение Redis
RUN set -eux; \
    pecl install redis; \
    docker-php-ext-enable redis; \
    rm -rf /tmp/pear

# Устанавливаем Composer v2.9.7
COPY --from=composer:2.9.7 /usr/bin/composer /usr/bin/composer

# Устанавливаем рабочую директорию
WORKDIR /var/www
ARG BUILD_BACKEND_ASSETS=false

# Копируем dependency manifests отдельно, чтобы PHP/Node зависимости кешировались между deploy.
COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/tmp/composer-cache \
    if [ ! -f composer.lock ]; then echo "composer.lock is required for production build" >&2; exit 1; fi \
    && COMPOSER_CACHE_DIR=/tmp/composer-cache composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-progress --no-scripts \
    && composer clear-cache

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    if [ "$BUILD_BACKEND_ASSETS" = "true" ] && [ -f package-lock.json ]; then \
        npm ci --no-audit --no-fund; \
    elif [ -f package.json ]; then \
        echo "Skipping backend npm install; set BUILD_BACKEND_ASSETS=true to build Laravel Vite assets."; \
    fi

# Копируем файлы проекта после установки зависимостей.
COPY . .

# Завершаем Laravel discovery после появления app/config/routes.
RUN composer dump-autoload --no-dev --optimize --no-interaction

# Собираем backend Vite assets, если backend содержит package-lock.json.
RUN if [ -f package-lock.json ]; then \
        if [ "$BUILD_BACKEND_ASSETS" = "true" ]; then npm run build; else echo "Skipping backend Vite build for API image."; fi \
        && npm cache clean --force \
        && rm -rf node_modules; \
    elif [ -f package.json ]; then \
        echo "package.json found but package-lock.json is missing; skipping npm build for reproducibility" >&2; \
    fi

# Готовим Laravel writable directories для runtime.
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

# Убираем искусственный bottleneck PHP-FPM под burst-нагрузкой дашборда и параллельных API-запросов.
RUN sed -i 's/^pm.max_children = .*/pm.max_children = 20/' /usr/local/etc/php-fpm.d/www.conf \
    && sed -i 's/^pm.start_servers = .*/pm.start_servers = 4/' /usr/local/etc/php-fpm.d/www.conf \
    && sed -i 's/^pm.min_spare_servers = .*/pm.min_spare_servers = 2/' /usr/local/etc/php-fpm.d/www.conf \
    && sed -i 's/^pm.max_spare_servers = .*/pm.max_spare_servers = 8/' /usr/local/etc/php-fpm.d/www.conf

# Включаем OPcache и JIT для ускорения Laravel.
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.jit_buffer_size=100M" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.jit=tracing" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini

# Production PHP limits for marketplace forms, photo/video uploads and Laravel runtime.
# Keep PHP request limits above Laravel's 51200 KB video validation cap.
RUN { \
        echo "memory_limit=256M"; \
        echo "upload_max_filesize=64M"; \
        echo "post_max_size=64M"; \
        echo "max_file_uploads=12"; \
        echo "max_execution_time=60"; \
        echo "max_input_time=60"; \
        echo "expose_php=0"; \
    } > /usr/local/etc/php/conf.d/mercasto-production.ini

# Production OPcache defaults: keep compiled scripts warm and avoid per-request timestamp checks.
RUN echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.memory_consumption=192" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini \
    && echo "opcache.max_accelerated_files=20000" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini

# PHP-FPM runtime metadata for compose/orchestrator visibility and graceful shutdown.
EXPOSE 9000
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD php-fpm -t || exit 1
