#!/bin/sh
# Uso: rodar.sh api|compatibilidade|testes
# versões: api compatibilidade
set -e
case "$1" in
  api)
    python -m morada.roteiro /dados ;;
  compatibilidade)
    python -m morada.propostas /dados ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: api|compatibilidade|testes" >&2; exit 1 ;;
esac
