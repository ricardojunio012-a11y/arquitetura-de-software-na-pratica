FROM node:24-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json vitest.config.ts rodar.sh ./
COPY decisoes ./decisoes
COPY decisoes-com-defeitos ./decisoes-com-defeitos
COPY src ./src
COPY test ./test
# O Node 24 executa TypeScript diretamente (remove as anotações de tipo ao carregar).
ENTRYPOINT ["sh", "rodar.sh"]
