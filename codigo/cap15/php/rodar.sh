#!/bin/sh
# Uso: rodar.sh api|compatibilidade|testes
# versões: api compatibilidade
set -e

# Sobe a API no servidor embutido do PHP, com quatro processos para atender pedidos
# simultâneos, e espera ela responder
subir_api() {
  PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8080 public/index.php >/dev/null 2>&1 &
  until php -r 'exit(@fsockopen("127.0.0.1", 8080) ? 0 : 1);'; do sleep 0.1; done
}

case "$1" in
  api)
    subir_api
    php src/roteiro.php /dados http://127.0.0.1:8080 ;;
  compatibilidade)
    php src/propostas.php /dados ;;
  testes)
    subir_api
    API_URL=http://127.0.0.1:8080 vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: api|compatibilidade|testes" >&2; exit 1 ;;
esac
