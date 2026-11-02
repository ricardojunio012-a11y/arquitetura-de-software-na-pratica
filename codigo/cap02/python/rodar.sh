#!/bin/sh
# Uso: rodar.sh cenarios|registro|testes
set -e
case "$1" in
  cenarios)
    python -m morada.main /dados/cenarios/cenarios.json ;;
  registro)
    python -m morada.registro /dados/cenarios/registro.json ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: cenarios|registro|testes" >&2; exit 1 ;;
esac
