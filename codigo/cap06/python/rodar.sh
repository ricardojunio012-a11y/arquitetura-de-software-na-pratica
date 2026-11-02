#!/bin/sh
# Uso: rodar.sh etapa1|...|etapa7|testes
# versões: etapa2 etapa3 etapa4 etapa5 etapa6 etapa7
set -e
case "$1" in
  etapa1|etapa2|etapa3|etapa4|etapa5|etapa6|etapa7)
    python -m "morada.$1.main" \
      /dados/entrada/reservas.json "/dados/saida/$1" --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: etapa1|...|etapa7|testes" >&2; exit 1 ;;
esac
