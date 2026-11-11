#!/bin/sh
# Uso: rodar.sh historico|pontos-quentes|acoplamento|caso|testes
#      rodar.sh analisar /caminho/de/um/repositorio   (o seu próprio repositório)
# versões: historico pontos-quentes acoplamento caso
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  historico|pontos-quentes|acoplamento|caso)
    $node src/principal.ts "$1" /dados/saida ;;
  analisar)
    $node src/principal.ts analisar "${2:?informe o caminho do repositório}" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: historico|pontos-quentes|acoplamento|caso|analisar <repo>|testes" >&2
    exit 1 ;;
esac
