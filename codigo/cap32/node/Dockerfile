# Etapa 1: o pacote da função. O runtime nodejs22.x da Lambda só carrega JavaScript,
# então o próprio Node 24 remove os tipos de prestacao.ts e o resultado vai num .zip
FROM node:24-alpine AS pacote
RUN apk add --no-cache zip
WORKDIR /fonte
COPY src/funcao/prestacao.ts ./
RUN node -e "const fs = require('node:fs'), m = require('node:module'); \
  const ts = fs.readFileSync('prestacao.ts', 'utf8'); \
  fs.writeFileSync('prestacao.mjs', m.stripTypeScriptTypes(ts))" \
 && zip -q -X /fonte/prestacao.zip prestacao.mjs

# Etapa 2: a imagem do laboratório. Só leva o que precisa para rodar
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json rodar.sh ./
COPY src ./src
COPY test ./test
COPY --from=pacote /fonte/prestacao.zip ./pacote/
# O Node 24 executa TypeScript diretamente (remove as anotações de tipo ao carregar).
ENTRYPOINT ["sh", "rodar.sh"]
