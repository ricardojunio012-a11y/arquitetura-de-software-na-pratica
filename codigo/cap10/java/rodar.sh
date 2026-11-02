#!/bin/sh
# Uso: rodar.sh antes|depois|arquitetura|testes
set -e
cp="target/classes:target/lib/*"
case "$1" in
  antes|depois)
    java -cp "$cp" "morada.$1.Main" /dados/entrada/comandos.json "/dados/saida/$1" ;;
  arquitetura)
    # O mesmo teste de arquitetura nas duas versões: antes deve falhar, depois passar
    echo "== antes"
    if java -cp "$cp" morada.Arquitetura antes; then
      echo "ERRO: a versão antes deveria violar a regra"; exit 1
    fi
    echo "== depois"
    java -cp "$cp" morada.Arquitetura depois
    echo "arquitetura: antes viola a fronteira; depois respeita" ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: antes|depois|arquitetura|testes" >&2; exit 1 ;;
esac
