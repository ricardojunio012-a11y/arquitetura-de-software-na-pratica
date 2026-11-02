#!/bin/sh
# Uso: rodar.sh online|offline|reinicio|persistida|testes
# versões: online offline reinicio persistida
set -e
case "$1" in
  online|offline|reinicio|persistida)
    python -m morada.main "$1" /dados/saida ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: online|offline|reinicio|persistida|testes" >&2; exit 1 ;;
esac
