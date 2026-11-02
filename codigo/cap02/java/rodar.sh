#!/bin/sh
# Uso: rodar.sh cenarios|registro|testes
set -e
case "$1" in
  cenarios)
    java -cp "target/classes:target/lib/*" morada.Main /dados/cenarios/cenarios.json ;;
  registro)
    java -cp "target/classes:target/lib/*" morada.Registro /dados/cenarios/registro.json ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: cenarios|registro|testes" >&2; exit 1 ;;
esac
