#!/bin/sh
# Uso: rodar.sh etapa1|etapa2|etapa3|etapa4|testes
set -e
case "$1" in
  etapa1|etapa2|etapa3|etapa4)
    node --disable-warning=ExperimentalWarning "src/$1/main.ts" \
      /dados/entrada/condominio.json "/dados/saida/$1" --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: etapa1|etapa2|etapa3|etapa4|testes" >&2; exit 1 ;;
esac
