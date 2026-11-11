#!/bin/sh
# Uso: rodar.sh ingenuo|saga|retomada|compensacao|testes
# versões: ingenuo saga retomada compensacao
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  ingenuo|saga|retomada|compensacao)
    $node src/onboarding.ts "$1" /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: ingenuo|saga|retomada|compensacao|testes" >&2; exit 1 ;;
esac
