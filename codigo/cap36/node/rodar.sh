#!/bin/sh
# Uso: rodar.sh idor|corrigido|segredos|testes
# versões: idor corrigido segredos
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  idor|corrigido)
    $node src/roteiro.ts "$1" /dados ;;
  segredos)
    $node src/segredos.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: idor|corrigido|segredos|testes" >&2; exit 1 ;;
esac
