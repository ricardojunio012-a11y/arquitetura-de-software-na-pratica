#!/bin/sh
# Uso: rodar.sh n1|corrigido|testes
# versões: n1 corrigido
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  n1|corrigido)
    $node src/carga.ts /dados "$1" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: n1|corrigido|testes" >&2; exit 1 ;;
esac
