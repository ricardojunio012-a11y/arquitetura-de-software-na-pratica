#!/bin/sh
# Uso: rodar.sh reservas|testes
# versões: reservas
set -e
case "$1" in
  reservas)
    python -m morada.main \
      /dados/entrada/reservas.json /dados/saida/reservas --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: reservas|testes" >&2; exit 1 ;;
esac
