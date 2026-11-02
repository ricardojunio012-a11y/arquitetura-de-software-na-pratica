#!/bin/sh
# Uso: rodar.sh memoria|escrita-dupla|outbox|testes
# versões: memoria escrita-dupla outbox
set -e
case "$1" in
  memoria|escrita-dupla|outbox)
    python -m morada.main "$1" "/dados/saida/$1" ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: memoria|escrita-dupla|outbox|testes" >&2; exit 1 ;;
esac
