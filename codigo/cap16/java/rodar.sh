#!/bin/sh
# Uso: rodar.sh consulta|isolamento|testes
# versões: consulta isolamento
set -e
cp="target/classes:target/lib/*"
case "$1" in
  consulta)
    java -cp "$cp" morada.Consulta /dados ;;
  isolamento)
    java -cp "$cp" morada.Isolamento /dados ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: consulta|isolamento|testes" >&2; exit 1 ;;
esac
