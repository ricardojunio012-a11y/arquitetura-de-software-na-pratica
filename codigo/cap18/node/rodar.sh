#!/bin/sh
# Uso: rodar.sh webhook|cnab|testes
# versões: webhook cnab
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  webhook)
    $node src/webhook/main.ts /dados ;;
  cnab)
    $node src/cnab/main.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: webhook|cnab|testes" >&2; exit 1 ;;
esac
