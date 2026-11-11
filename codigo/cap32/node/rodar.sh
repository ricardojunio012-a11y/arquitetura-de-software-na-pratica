#!/bin/sh
# Uso: rodar.sh manifestos|hpa|funcao|custo|nuvem|testes
# versões: manifestos hpa funcao custo
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  manifestos)
    $node src/conferir.ts /dados ;;
  hpa)
    $node src/dia5.ts /dados ;;
  funcao)
    $node src/funcao.ts /dados ;;
  custo)
    $node src/custo.ts /dados ;;
  nuvem)
    $node src/nuvem.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: manifestos|hpa|funcao|custo|nuvem|testes" >&2; exit 1 ;;
esac
