#!/bin/sh
# Uso: rodar.sh online|offline|reinicio|persistida|testes
# versões: online offline reinicio persistida
set -e
case "$1" in
  online|offline|reinicio|persistida)
    java -cp "target/classes:target/lib/*" morada.Main "$1" /dados/saida ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: online|offline|reinicio|persistida|testes" >&2; exit 1 ;;
esac
