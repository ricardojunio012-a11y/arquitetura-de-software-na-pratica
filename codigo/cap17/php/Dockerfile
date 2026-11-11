# Etapa 1: instala as dependências (PHPUnit) com o Composer
FROM composer:2 AS dependencias
WORKDIR /app
COPY composer.json ./
RUN composer install --no-interaction --no-progress --ignore-platform-req=php

# Etapa 2: imagem final só com o PHP de linha de comando
FROM php:8.3-cli-alpine
# Driver do PostgreSQL (pdo_pgsql): compila a extensão e mantém só a biblioteca libpq
RUN apk add --no-cache libpq \
    && apk add --no-cache --virtual .compilar $PHPIZE_DEPS postgresql-dev \
    && docker-php-ext-install pdo_pgsql \
    && apk del .compilar
WORKDIR /app
COPY --from=dependencias /app/vendor ./vendor
COPY rodar.sh ./
COPY src ./src
COPY tests ./tests
ENTRYPOINT ["sh", "rodar.sh"]
