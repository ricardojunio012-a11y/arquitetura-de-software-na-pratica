#!/bin/sh
# Uso: rodar.sh consulta|isolamento|testes
# versões: consulta isolamento
set -e
case "$1" in
  consulta)
    php src/consulta.php /dados ;;
  isolamento)
    php src/isolamento.php /dados ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: consulta|isolamento|testes" >&2; exit 1 ;;
esac
