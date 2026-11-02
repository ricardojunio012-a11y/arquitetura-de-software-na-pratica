#!/bin/sh
# Uso: rodar.sh antes|depois|testes
set -e
case "$1" in
  antes|depois)
    node --disable-warning=ExperimentalWarning "src/$1/main.ts" \
      /dados/entrada/financeiro.json "/dados/saida/$1" --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: antes|depois|testes" >&2; exit 1 ;;
esac
