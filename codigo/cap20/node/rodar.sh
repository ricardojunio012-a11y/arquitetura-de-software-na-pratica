#!/bin/sh
# Uso: rodar.sh assistente|avaliacao|variacao|testes
# versões: assistente avaliacao variacao
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  assistente)
    $node src/main-assistente.ts /dados ;;
  avaliacao)
    $node src/main-avaliacao.ts /dados ;;
  variacao)
    $node src/main-variacao.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: assistente|avaliacao|variacao|testes" >&2; exit 1 ;;
esac
