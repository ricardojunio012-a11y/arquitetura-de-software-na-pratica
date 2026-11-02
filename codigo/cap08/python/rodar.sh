#!/bin/sh
# Uso: rodar.sh camadas|plugins|testes
# versões: camadas plugins
set -e
case "$1" in
  camadas)
    python -m morada.camadas.main /dados/entrada/requisicoes.json /dados/saida/camadas ;;
  plugins)
    python -m morada.plugins.main /dados/entrada/cobrancas.json /app/plugins \
      /dados/saida/plugins ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: camadas|plugins|testes" >&2; exit 1 ;;
esac
