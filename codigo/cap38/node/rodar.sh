#!/bin/sh
# Uso: rodar.sh registro|defeitos|aptidao|testes
# versões: registro defeitos aptidao
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  registro)
    $node src/registro.ts /dados registro decisoes ;;
  defeitos)
    # o validador sai com código 1 quando acha problemas, como deve fazer na esteira
    $node src/registro.ts /dados defeitos decisoes-com-defeitos ||
      echo "(o validador saiu com código 1)" ;;
  aptidao)
    $node src/esteira.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: registro|defeitos|aptidao|testes" >&2; exit 1 ;;
esac
