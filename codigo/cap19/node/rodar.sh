#!/bin/sh
# Uso: rodar.sh elt|testes
# versões: elt
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  elt)
    $node src/pipeline.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: elt|testes" >&2; exit 1 ;;
esac
