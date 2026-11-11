#!/bin/sh
# Uso: rodar.sh unidade|crescimento|cfo|compromisso|testes
# versões: unidade crescimento cfo compromisso
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  unidade|crescimento|cfo|compromisso)
    $node "src/$1.ts" /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: unidade|crescimento|cfo|compromisso|testes" >&2; exit 1 ;;
esac
