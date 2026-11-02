#!/bin/sh
# Uso: rodar.sh memoria|escrita-dupla|outbox|testes
# versões: memoria escrita-dupla outbox
set -e
case "$1" in
  memoria|escrita-dupla|outbox)
    node --disable-warning=ExperimentalWarning src/main.ts "$1" "/dados/saida/$1" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: memoria|escrita-dupla|outbox|testes" >&2; exit 1 ;;
esac
