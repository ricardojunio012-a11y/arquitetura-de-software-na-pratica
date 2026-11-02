#!/bin/sh
# Uso: rodar.sh antes|depois|arquitetura|testes
set -e
case "$1" in
  antes|depois)
    php "src/$1/main.php" /dados/entrada/comandos.json "/dados/saida/$1" ;;
  arquitetura)
    # O mesmo teste de arquitetura nas duas versões: antes deve falhar, depois passar
    echo "== antes"
    if vendor/bin/deptrac analyse --config-file=deptrac-antes.yaml --no-progress; then
      echo "ERRO: a versão antes deveria violar a regra"; exit 1
    fi
    echo "== depois"
    vendor/bin/deptrac analyse --config-file=deptrac-depois.yaml --no-progress
    echo "arquitetura: antes viola a fronteira; depois respeita" ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: antes|depois|arquitetura|testes" >&2; exit 1 ;;
esac
