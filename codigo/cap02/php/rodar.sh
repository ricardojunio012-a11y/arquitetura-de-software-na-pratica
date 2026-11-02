#!/bin/sh
# Uso: rodar.sh cenarios|registro|testes
set -e
case "$1" in
  cenarios)
    php src/main.php /dados/cenarios/cenarios.json ;;
  registro)
    php src/registro.php /dados/cenarios/registro.json ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: cenarios|registro|testes" >&2; exit 1 ;;
esac
