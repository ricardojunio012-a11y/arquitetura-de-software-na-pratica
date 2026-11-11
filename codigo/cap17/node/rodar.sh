#!/bin/sh
# Uso: rodar.sh vazamento|barulho|testes
# versões: vazamento barulho
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  vazamento)
    $node src/vazamento.ts /dados ;;
  barulho)
    $node src/barulho.ts /dados ;;
  testes)
    # Um arquivo por vez: o teste de RLS recria as tabelas do banco
    npx tsc && npx vitest run --no-file-parallelism ;;
  *)
    echo "uso: vazamento|barulho|testes" >&2; exit 1 ;;
esac
