#!/bin/sh
# Uso: rodar.sh tempo-real|offline|reinicio|testes
# versões: tempo-real offline reinicio
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  tempo-real)
    $node src/tempo-real.ts /dados ;;
  offline)
    $node src/offline.ts /dados ;;
  reinicio)
    $node src/reinicio.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: tempo-real|offline|reinicio|testes" >&2; exit 1 ;;
esac
