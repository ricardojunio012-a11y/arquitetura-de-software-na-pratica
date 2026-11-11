#!/bin/sh
# Uso: rodar.sh resiliencia|camadas|testes
# versões: resiliencia camadas
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  resiliencia)
    $node src/resiliencia.ts /dados ;;
  camadas)
    $node src/camadas.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: resiliencia|camadas|testes" >&2; exit 1 ;;
esac
