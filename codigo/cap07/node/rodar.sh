#!/bin/sh
# Uso: rodar.sh antes|depois|testes
set -e
case "$1" in
  antes|depois)
    node --disable-warning=ExperimentalWarning "src/$1/main.ts" \
      /dados/entrada/comandos.json "/dados/saida/$1" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: antes|depois|testes" >&2; exit 1 ;;
esac
