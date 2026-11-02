# Etapa 1: instala as dependências (PHPUnit) com o Composer
FROM composer:2 AS dependencias
WORKDIR /app
COPY composer.json ./
RUN composer install --no-interaction --no-progress --ignore-platform-req=php

# Etapa 2: imagem final só com o PHP de linha de comando
FROM php:8.3-cli-alpine
WORKDIR /app
COPY --from=dependencias /app/vendor ./vendor
COPY rodar.sh ./
COPY src ./src
COPY tests ./tests
ENTRYPOINT ["sh", "rodar.sh"]
