#!/bin/sh
# Uso: rodar.sh replica|particao|sharding|testes
# versões: replica particao sharding
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  replica)
    $node src/replica.ts /dados ;;
  particao)
    $node src/particao.ts /dados ;;
  sharding)
    $node src/sharding.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: replica|particao|sharding|testes" >&2; exit 1 ;;
esac
