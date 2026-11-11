FROM node:24-slim
WORKDIR /app
COPY package.json ./
# O DuckDB traz um binário nativo para Linux com glibc; por isso a imagem slim, e não
# a alpine
RUN npm install --no-audit --no-fund
COPY tsconfig.json rodar.sh ./
COPY src ./src
COPY test ./test
# O Node 24 executa TypeScript diretamente (remove as anotações de tipo ao carregar).
ENTRYPOINT ["sh", "rodar.sh"]
