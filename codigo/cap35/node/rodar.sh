#!/bin/sh
# Uso: rodar.sh pitr|desastre|caos|api|testes
# versões: pitr desastre caos
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  pitr)
    $node src/pitr.ts /dados ;;
  desastre)
    $node src/desastre.ts /dados ;;
  caos)
    $node src/caos.ts /dados ;;
  api)
    exec $node src/api.ts ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: pitr|desastre|caos|api|testes" >&2; exit 1 ;;
esac
