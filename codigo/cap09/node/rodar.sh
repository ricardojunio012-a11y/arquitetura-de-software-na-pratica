#!/bin/sh
# Uso: rodar.sh http-memoria|http-postgres|cli-postgres|testes
# versões: http-memoria http-postgres cli-postgres
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  http-memoria|http-postgres)
    $node src/main/http.ts "${1#http-}" "/dados/saida/$1" ;;
  cli-postgres)
    # Um processo por comando, como uma pessoa digitando no terminal
    saida=/dados/saida/cli-postgres
    mkdir -p "$saida"
    $node src/main/cli.ts preparar-banco >/dev/null
    : >"$saida/terminal.txt"
    while read -r linha; do
      echo "\$ morada $linha" >>"$saida/terminal.txt"
      # shellcheck disable=SC2086
      $node src/main/cli.ts $linha >>"$saida/terminal.txt" || true
    done </dados/entrada/comandos.txt
    echo "terminal gravado em $saida" ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: http-memoria|http-postgres|cli-postgres|testes" >&2; exit 1 ;;
esac
