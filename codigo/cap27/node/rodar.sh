#!/bin/sh
# Uso: rodar.sh assincrona|sincrona|promocao|testes
# versões: assincrona sincrona promocao
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  assincrona|sincrona)
    $node src/particao.ts /dados "$1" ;;
  promocao)
    $node src/promocao.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: assincrona|sincrona|promocao|testes" >&2; exit 1 ;;
esac
