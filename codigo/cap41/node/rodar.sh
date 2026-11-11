#!/bin/sh
# Uso: rodar.sh inventario|traducao|migracao|paralelo|desligamento|testes
# versões: inventario traducao migracao paralelo desligamento
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  inventario|traducao|migracao|paralelo|desligamento)
    $node src/main.ts /dados "$1" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: inventario|traducao|migracao|paralelo|desligamento|testes" >&2; exit 1 ;;
esac
