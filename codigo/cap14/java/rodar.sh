#!/bin/sh
# Uso: rodar.sh consumidor|provedor|testes|medir
# versões: consumidor provedor
set -e
cp="target/classes:target/lib/*"
case "$1" in
  consumidor)
    java -cp "$cp" morada.contrato.Consumidor /dados/saida ;;
  provedor)
    java -cp "$cp" morada.contrato.Provedor /dados/saida ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  medir)
    # Tempo de execução de cada camada da suíte, informado pelo Maven Surefire (sem
    # contar a partida da ferramenta). Varia de máquina para máquina.
    for camada in Unidade Integracao PontaAPonta; do
      tempo=$(mvn -o test -Dtest="${camada}Test" | sed -n 's/.*Time elapsed: \([0-9.]* s\).*/\1/p')
      echo "$camada: $tempo"
    done ;;
  *)
    echo "uso: consumidor|provedor|testes|medir" >&2; exit 1 ;;
esac
