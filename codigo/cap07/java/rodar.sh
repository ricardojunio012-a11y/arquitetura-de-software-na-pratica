#!/bin/sh
# Uso: rodar.sh antes|depois|testes
set -e
case "$1" in
  antes|depois)
    java -cp "target/classes:target/lib/*" "morada.$1.Main" \
      /dados/entrada/comandos.json "/dados/saida/$1" ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: antes|depois|testes" >&2; exit 1 ;;
esac
