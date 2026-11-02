#!/bin/sh
# Uso: rodar.sh monolito|servico|contatos|api|saude|testes
# versões: monolito servico contatos
set -e
case "$1" in
  monolito|servico)
    php src/main.php "$1" /dados/saida ;;
  contatos)
    php src/contatos.php /dados/saida ;;
  api)
    # Servidor HTTP embutido do PHP: serve para o laboratório, não para produção
    exec php -S 0.0.0.0:8080 src/servico.php ;;
  saude)
    wget -q -O /dev/null http://127.0.0.1:8080/saude ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: monolito|servico|contatos|api|saude|testes" >&2; exit 1 ;;
esac
