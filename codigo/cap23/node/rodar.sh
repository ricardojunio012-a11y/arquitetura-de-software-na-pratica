#!/bin/sh
# Uso: rodar.sh cache-aside|estouro|xfetch|testes
# versões: cache-aside estouro xfetch
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  cache-aside|estouro)
    $node src/cenarios.ts /dados "$1" ;;
  xfetch)
    $node src/xfetch.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: cache-aside|estouro|xfetch|testes" >&2; exit 1 ;;
esac
