#!/bin/sh
# Uso: rodar.sh vazamento|barulho|testes
# versões: vazamento barulho
set -e
case "$1" in
  vazamento)
    php src/vazamento.php /dados ;;
  barulho)
    php src/barulho.php /dados ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: vazamento|barulho|testes" >&2; exit 1 ;;
esac
