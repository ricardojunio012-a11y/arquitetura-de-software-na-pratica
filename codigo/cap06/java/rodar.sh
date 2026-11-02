#!/bin/sh
# Uso: rodar.sh etapa1|...|etapa7|testes
# versões: etapa2 etapa3 etapa4 etapa5 etapa6 etapa7
set -e
case "$1" in
  etapa1|etapa2|etapa3|etapa4|etapa5|etapa6|etapa7)
    java -cp "target/classes:target/lib/*" "morada.$1.Main" \
      /dados/entrada/reservas.json "/dados/saida/$1" --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: etapa1|...|etapa7|testes" >&2; exit 1 ;;
esac
