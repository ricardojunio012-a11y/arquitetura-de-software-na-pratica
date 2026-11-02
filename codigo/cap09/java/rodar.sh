#!/bin/sh
# Uso: rodar.sh http-memoria|http-postgres|cli-postgres|testes
# versões: http-memoria http-postgres cli-postgres
set -e
java="java -cp target/classes:target/lib/*"
case "$1" in
  http-memoria|http-postgres)
    $java morada.main.MainHttp "${1#http-}" "/dados/saida/$1" ;;
  cli-postgres)
    # Um processo por comando, como uma pessoa digitando no terminal
    saida=/dados/saida/cli-postgres
    mkdir -p "$saida"
    $java morada.main.MainCli preparar-banco >/dev/null
    : >"$saida/terminal.txt"
    while read -r linha; do
      echo "\$ morada $linha" >>"$saida/terminal.txt"
      # shellcheck disable=SC2086
      $java morada.main.MainCli $linha >>"$saida/terminal.txt" || true
    done </dados/entrada/comandos.txt
    echo "terminal gravado em $saida" ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: http-memoria|http-postgres|cli-postgres|testes" >&2; exit 1 ;;
esac
