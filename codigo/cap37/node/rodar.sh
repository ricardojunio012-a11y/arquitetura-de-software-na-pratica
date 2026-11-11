#!/bin/sh
# Uso: rodar.sh ingenuo|esquecimento|trilha|testes
# versões: ingenuo esquecimento trilha
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  ingenuo|esquecimento|trilha)
    $node src/laboratorio.ts "$1" /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: ingenuo|esquecimento|trilha|testes" >&2; exit 1 ;;
esac
