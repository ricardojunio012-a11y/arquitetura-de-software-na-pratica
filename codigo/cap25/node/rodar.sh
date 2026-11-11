#!/bin/sh
# Uso: rodar.sh fila|pressao|testes
# versões: fila pressao
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  fila|pressao)
    $node src/main.ts /dados "$1" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: fila|pressao|testes" >&2; exit 1 ;;
esac
