#!/bin/sh
# Uso: rodar.sh cenarios|registro|testes
set -e
case "$1" in
  cenarios)
    node --disable-warning=ExperimentalWarning src/main.ts /dados/cenarios/cenarios.json ;;
  registro)
    node --disable-warning=ExperimentalWarning src/registro.ts /dados/cenarios/registro.json ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: cenarios|registro|testes" >&2; exit 1 ;;
esac
