#!/bin/sh
# Uso: rodar.sh antes|depois|testes
set -e
case "$1" in
  antes|depois)
    php "src/$1/main.php" /dados/entrada/comandos.json "/dados/saida/$1" ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: antes|depois|testes" >&2; exit 1 ;;
esac
