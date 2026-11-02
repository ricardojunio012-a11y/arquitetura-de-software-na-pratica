#!/bin/sh
# Uso: rodar.sh reservas|testes
# versões: reservas
set -e
case "$1" in
  reservas)
    php src/main.php \
      /dados/entrada/reservas.json /dados/saida/reservas --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: reservas|testes" >&2; exit 1 ;;
esac
