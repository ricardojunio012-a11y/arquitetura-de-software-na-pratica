#!/bin/sh
# Uso: rodar.sh online|offline|reinicio|persistida|testes
# versões: online offline reinicio persistida
set -e
case "$1" in
  online|offline|reinicio|persistida)
    node --disable-warning=ExperimentalWarning src/main.ts "$1" /dados/saida ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: online|offline|reinicio|persistida|testes" >&2; exit 1 ;;
esac
