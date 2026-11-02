#!/bin/sh
# Uso: rodar.sh http-memoria|http-postgres|cli-postgres|testes
# versões: http-memoria http-postgres cli-postgres
set -e
case "$1" in
  http-memoria|http-postgres)
    python -m morada.main.http "${1#http-}" "/dados/saida/$1" ;;
  cli-postgres)
    # Um processo por comando, como uma pessoa digitando no terminal
    saida=/dados/saida/cli-postgres
    mkdir -p "$saida"
    python -m morada.main.cli preparar-banco >/dev/null
    : >"$saida/terminal.txt"
    while read -r linha; do
      echo "\$ morada $linha" >>"$saida/terminal.txt"
      # shellcheck disable=SC2086
      python -m morada.main.cli $linha >>"$saida/terminal.txt" || true
    done </dados/entrada/comandos.txt
    echo "terminal gravado em $saida" ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: http-memoria|http-postgres|cli-postgres|testes" >&2; exit 1 ;;
esac
