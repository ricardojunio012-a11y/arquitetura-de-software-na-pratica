#!/bin/sh
# Uso: rodar.sh camadas|plugins|testes
# versões: camadas plugins
set -e
case "$1" in
  camadas)
    node --disable-warning=ExperimentalWarning src/camadas/main.ts \
      /dados/entrada/requisicoes.json /dados/saida/camadas ;;
  plugins)
    node --disable-warning=ExperimentalWarning src/plugins/main.ts \
      /dados/entrada/cobrancas.json /app/plugins /dados/saida/plugins ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: camadas|plugins|testes" >&2; exit 1 ;;
esac
