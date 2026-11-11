#!/bin/sh
# Uso: rodar.sh consulta|isolamento|testes
# versões: consulta isolamento
set -e
case "$1" in
  consulta)
    python -m morada.consulta /dados ;;
  isolamento)
    python -m morada.isolamento /dados ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: consulta|isolamento|testes" >&2; exit 1 ;;
esac
