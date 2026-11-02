#!/bin/sh
# Uso: rodar.sh etapa1|etapa2|etapa3|etapa4|testes
set -e
case "$1" in
  etapa1|etapa2|etapa3|etapa4)
    java -cp "target/classes:target/lib/*" "morada.$1.Main" \
      /dados/entrada/condominio.json "/dados/saida/$1" --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: etapa1|etapa2|etapa3|etapa4|testes" >&2; exit 1 ;;
esac
