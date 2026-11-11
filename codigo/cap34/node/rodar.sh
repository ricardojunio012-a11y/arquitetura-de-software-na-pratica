#!/bin/sh
# Uso: rodar.sh rastro|metricas|slo|testes
# versões: rastro metricas slo
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  rastro)
    $node src/rastro.ts /dados ;;
  metricas)
    $node src/metricas.ts /dados ;;
  slo)
    $node src/slo.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: rastro|metricas|slo|testes" >&2; exit 1 ;;
esac
