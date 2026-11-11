FROM node:24-alpine
# git: o laboratório cria um repositório de verdade e lê o histórico com git log
RUN apk add --no-cache git
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json rodar.sh premissas.json ./
COPY src ./src
COPY test ./test
# O Node 24 executa TypeScript diretamente (remove as anotações de tipo ao carregar).
ENTRYPOINT ["sh", "rodar.sh"]
