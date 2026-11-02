#!/bin/sh
# Uso: rodar.sh reservas|testes
# versões: reservas
set -e
case "$1" in
  reservas)
    java -cp "target/classes:target/lib/*" morada.Main \
      /dados/entrada/reservas.json /dados/saida/reservas --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: reservas|testes" >&2; exit 1 ;;
esac
