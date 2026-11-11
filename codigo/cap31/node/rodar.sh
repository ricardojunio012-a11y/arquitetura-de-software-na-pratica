#!/bin/sh
# Uso: rodar.sh provisionar|fluxo|abandono|custo|testes
# versões: provisionar fluxo abandono custo
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  provisionar)
    $node src/provisionar.ts /dados ;;
  fluxo)
    $node src/fluxo.ts /dados ;;
  abandono)
    $node src/abandono.ts /dados ;;
  custo)
    $node src/custo.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: provisionar|fluxo|abandono|custo|testes" >&2; exit 1 ;;
esac
