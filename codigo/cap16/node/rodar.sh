#!/bin/sh
# Uso: rodar.sh consulta|isolamento|testes
# versões: consulta isolamento
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  consulta)
    $node src/consulta.ts /dados ;;
  isolamento)
    $node src/isolamento.ts /dados ;;
  testes)
    # Um arquivo por vez: os testes recriam o esquema do banco
    npx tsc && npx vitest run --no-file-parallelism ;;
  *)
    echo "uso: consulta|isolamento|testes" >&2; exit 1 ;;
esac
