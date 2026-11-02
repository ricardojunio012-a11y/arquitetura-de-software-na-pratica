#!/bin/sh
# Uso: rodar.sh antes|depois|testes
set -e
case "$1" in
  antes|depois)
    php "src/$1/main.php" /dados/entrada/condominio.json "/dados/saida/$1" --hoje "${HOJE:-2026-03-02}" ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: antes|depois|testes" >&2; exit 1 ;;
esac
