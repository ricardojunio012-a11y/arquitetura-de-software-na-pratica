# Etapa 1: instala as dependências (php-amqplib e PHPUnit) com o Composer
FROM composer:2 AS dependencias
WORKDIR /app
COPY composer.json ./
RUN composer install --no-interaction --no-progress

# Etapa 2: imagem final só com o PHP de linha de comando
FROM php:8.3-cli-alpine
# Extensões pdo_pgsql (PostgreSQL) e sockets (usada pelo cliente do RabbitMQ):
# compila as extensões e mantém só a biblioteca libpq
RUN apk add --no-cache libpq \
    && apk add --no-cache --virtual .compilar $PHPIZE_DEPS postgresql-dev linux-headers \
    && docker-php-ext-install pdo_pgsql sockets \
    && apk del .compilar
WORKDIR /app
COPY --from=dependencias /app/vendor ./vendor
COPY rodar.sh ./
COPY src ./src
COPY tests ./tests
ENTRYPOINT ["sh", "rodar.sh"]
