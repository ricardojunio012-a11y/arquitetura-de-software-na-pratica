#!/bin/sh
# Uso: rodar.sh etapa1|etapa2|etapa3|etapa4|testes
set -e
case "$1" in
  etapa1|etapa2|etapa3|etapa4)
    python -m "morada.$1.main" /dados/entrada/condominio.json "/dados/saida/$1" --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: etapa1|etapa2|etapa3|etapa4|testes" >&2; exit 1 ;;
esac
