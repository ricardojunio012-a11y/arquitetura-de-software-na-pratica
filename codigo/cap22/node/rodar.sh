#!/bin/sh
# Uso: rodar.sh sessao-memoria|sessao-redis|queda|algoritmos|testes
# versões: sessao-memoria sessao-redis queda algoritmos
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  sessao-memoria|sessao-redis|queda)
    $node src/cenarios.ts /dados "$1" ;;
  algoritmos)
    $node src/algoritmos.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: sessao-memoria|sessao-redis|queda|algoritmos|testes" >&2; exit 1 ;;
esac
