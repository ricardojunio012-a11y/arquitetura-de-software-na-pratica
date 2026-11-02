#!/bin/sh
# Uso: rodar.sh online|offline|reinicio|persistida|testes
# versões: online offline reinicio persistida
set -e
case "$1" in
  online|offline|reinicio|persistida)
    php src/main.php "$1" /dados/saida ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: online|offline|reinicio|persistida|testes" >&2; exit 1 ;;
esac
