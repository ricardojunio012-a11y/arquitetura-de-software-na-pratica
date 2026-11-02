# Etapa 1: instala as dependências (PHPUnit e deptrac) com o Composer
FROM composer:2 AS dependencias
WORKDIR /app
COPY composer.json ./
RUN composer install --no-interaction --no-progress

# Etapa 2: imagem final só com o PHP de linha de comando
FROM php:8.3-cli-alpine
WORKDIR /app
COPY --from=dependencias /app/vendor ./vendor
COPY rodar.sh deptrac-antes.yaml deptrac-depois.yaml ./
COPY src ./src
COPY tests ./tests
ENTRYPOINT ["sh", "rodar.sh"]
