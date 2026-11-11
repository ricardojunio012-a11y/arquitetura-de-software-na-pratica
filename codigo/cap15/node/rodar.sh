#!/bin/sh
# Uso: rodar.sh api|compatibilidade|testes
# versões: api compatibilidade
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  api)
    $node src/roteiro.ts /dados ;;
  compatibilidade)
    $node src/propostas.ts /dados ;;
  testes)
    # Um arquivo por vez: o teste de integração recria as tabelas do banco
    npx tsc && npx vitest run --no-file-parallelism ;;
  *)
    echo "uso: api|compatibilidade|testes" >&2; exit 1 ;;
esac
