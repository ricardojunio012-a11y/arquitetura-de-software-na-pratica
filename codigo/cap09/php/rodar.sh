#!/bin/sh
# Uso: rodar.sh http-memoria|http-postgres|cli-postgres|testes
# versões: http-memoria http-postgres cli-postgres
set -e
case "$1" in
  http-memoria|http-postgres)
    php src/main/http.php "${1#http-}" "/dados/saida/$1" ;;
  cli-postgres)
    # Um processo por comando, como uma pessoa digitando no terminal
    saida=/dados/saida/cli-postgres
    mkdir -p "$saida"
    php src/main/cli.php preparar-banco >/dev/null
    : >"$saida/terminal.txt"
    while read -r linha; do
      echo "\$ morada $linha" >>"$saida/terminal.txt"
      # shellcheck disable=SC2086
      php src/main/cli.php $linha >>"$saida/terminal.txt" || true
    done </dados/entrada/comandos.txt
    echo "terminal gravado em $saida" ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: http-memoria|http-postgres|cli-postgres|testes" >&2; exit 1 ;;
esac
