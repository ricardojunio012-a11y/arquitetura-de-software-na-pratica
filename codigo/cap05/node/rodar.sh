#!/bin/sh
# Uso: rodar.sh reservas|testes
# versões: reservas
set -e
case "$1" in
  reservas)
    node --disable-warning=ExperimentalWarning src/main.ts \
      /dados/entrada/reservas.json /dados/saida/reservas --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: reservas|testes" >&2; exit 1 ;;
esac
