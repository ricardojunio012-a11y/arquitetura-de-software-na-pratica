#!/bin/sh
# Uso: rodar.sh monolito|servico|contatos|api|saude|testes
# versões: monolito servico contatos
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  monolito|servico)
    $node src/main.ts "$1" /dados/saida ;;
  contatos)
    $node src/contatos.ts /dados/saida ;;
  api)
    exec $node src/servico.ts ;;
  saude)
    wget -q -O /dev/null http://127.0.0.1:8080/saude ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: monolito|servico|contatos|api|saude|testes" >&2; exit 1 ;;
esac
