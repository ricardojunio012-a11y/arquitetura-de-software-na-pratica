#!/bin/sh
# Uso: rodar.sh camadas|plugins|testes
# versões: camadas plugins
set -e
case "$1" in
  camadas)
    php src/camadas/main.php /dados/entrada/requisicoes.json /dados/saida/camadas ;;
  plugins)
    php src/plugins/main.php /dados/entrada/cobrancas.json /app/plugins \
      /dados/saida/plugins ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  *)
    echo "uso: camadas|plugins|testes" >&2; exit 1 ;;
esac
