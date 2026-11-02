#!/bin/sh
# Uso: rodar.sh antes|depois|testes
set -e
case "$1" in
  antes|depois)
    python -m "morada.$1.main" /dados/entrada/comandos.json "/dados/saida/$1" ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: antes|depois|testes" >&2; exit 1 ;;
esac
