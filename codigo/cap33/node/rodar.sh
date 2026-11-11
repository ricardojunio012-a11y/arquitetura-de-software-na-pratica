#!/bin/sh
# Uso: rodar.sh esteira|renomear|expandir|atalho|infra|testes
# versões: esteira renomear expandir atalho infra
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  esteira)
    $node src/esteira.ts /dados ;;
  renomear|expandir|atalho)
    $node src/colunas/publicacoes.ts /dados "$1" ;;
  infra)
    $node src/infra.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: esteira|renomear|expandir|atalho|infra|testes" >&2; exit 1 ;;
esac
