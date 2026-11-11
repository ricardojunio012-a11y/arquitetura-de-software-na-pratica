#!/bin/sh
# Uso: rodar.sh api|compatibilidade|testes
# versões: api compatibilidade
set -e
cp="target/classes:target/lib/*"
case "$1" in
  api)
    java -cp "$cp" morada.Roteiro /dados ;;
  compatibilidade)
    java -cp "$cp" morada.Propostas /dados ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: api|compatibilidade|testes" >&2; exit 1 ;;
esac
