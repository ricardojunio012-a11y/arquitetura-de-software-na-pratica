#!/bin/sh
# Uso: rodar.sh memoria|escrita-dupla|outbox|testes
# versões: memoria escrita-dupla outbox
set -e
case "$1" in
  memoria|escrita-dupla|outbox)
    java -cp "target/classes:target/lib/*" morada.Main "$1" "/dados/saida/$1" ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: memoria|escrita-dupla|outbox|testes" >&2; exit 1 ;;
esac
