# A imagem mínima do OpenTofu só serve para copiar o binário (é o uso documentado)
FROM ghcr.io/opentofu/opentofu:1.10.6-minimal AS tofu

FROM node:24-alpine
COPY --from=tofu /usr/local/bin/tofu /usr/local/bin/tofu
WORKDIR /app
# Baixa os provedores do OpenTofu uma vez, na construção da imagem
COPY infra ./infra
RUN tofu -chdir=infra init -input=false
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json vitest.config.ts vitest.esteira.ts .dependency-cruiser.cjs rodar.sh ./
COPY src ./src
COPY test ./test
# O Node 24 executa TypeScript diretamente (remove as anotações de tipo ao carregar).
ENTRYPOINT ["sh", "rodar.sh"]
