#!/bin/sh
# Uso: rodar.sh memoria|escrita-dupla|outbox|testes
# versões: memoria escrita-dupla outbox
set -e
case "$1" in
  memoria|escrita-dupla|outbox)
    php src/main.php "$1" "/dados/saida/$1" ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: memoria|escrita-dupla|outbox|testes" >&2; exit 1 ;;
esac
