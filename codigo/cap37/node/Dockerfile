FROM node:24-alpine
# pg_dump e psql, para o backup noturno e a restauração
RUN apk add --no-cache postgresql17-client
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json rodar.sh ./
COPY src ./src
COPY test ./test
# O Node 24 executa TypeScript diretamente (remove as anotações de tipo ao carregar).
ENTRYPOINT ["sh", "rodar.sh"]
