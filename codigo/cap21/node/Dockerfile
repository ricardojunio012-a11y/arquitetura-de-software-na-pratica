FROM node:24-alpine
# O k6 é um binário único: vem pronto da imagem oficial
COPY --from=grafana/k6:1.3.0 /usr/bin/k6 /usr/bin/k6
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json rodar.sh ./
COPY src ./src
COPY test ./test
COPY k6 ./k6
# O Node 24 executa TypeScript diretamente (remove as anotações de tipo ao carregar).
ENTRYPOINT ["sh", "rodar.sh"]
