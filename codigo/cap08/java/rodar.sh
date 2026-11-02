#!/bin/sh
# Uso: rodar.sh camadas|plugins|testes
# versões: camadas plugins
set -e
cp="target/classes:target/lib/*"
case "$1" in
  camadas)
    java -cp "$cp" morada.camadas.Main /dados/entrada/requisicoes.json \
      /dados/saida/camadas ;;
  plugins)
    java -cp "$cp" morada.plugins.Main /dados/entrada/cobrancas.json /app/plugins \
      /dados/saida/plugins ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: camadas|plugins|testes" >&2; exit 1 ;;
esac
