FROM node:24-alpine
# O PostgreSQL 17 do Alpine traz o pg_basebackup, o pg_dump e o próprio servidor,
# usado para restaurar o backup numa instância à parte. su-exec roda o servidor
# como o usuário postgres (o PostgreSQL recusa rodar como root).
RUN apk add --no-cache postgresql17 postgresql17-client su-exec
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json rodar.sh ./
COPY src ./src
COPY test ./test
# O Node 24 executa TypeScript diretamente (remove as anotações de tipo ao carregar).
ENTRYPOINT ["sh", "rodar.sh"]
