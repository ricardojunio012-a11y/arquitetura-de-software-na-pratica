#!/bin/sh
# Uso: rodar.sh vazamento|barulho|testes
# versões: vazamento barulho
set -e
case "$1" in
  vazamento)
    python -m morada.vazamento /dados ;;
  barulho)
    python -m morada.barulho /dados ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: vazamento|barulho|testes" >&2; exit 1 ;;
esac
