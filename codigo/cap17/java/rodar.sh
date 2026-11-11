#!/bin/sh
# Uso: rodar.sh vazamento|barulho|testes
# versões: vazamento barulho
set -e
cp="target/classes:target/lib/*"
case "$1" in
  vazamento)
    java -cp "$cp" morada.Vazamento /dados ;;
  barulho)
    java -cp "$cp" morada.Barulho /dados ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: vazamento|barulho|testes" >&2; exit 1 ;;
esac
