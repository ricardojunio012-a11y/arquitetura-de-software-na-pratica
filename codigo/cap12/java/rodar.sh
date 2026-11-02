#!/bin/sh
# Uso: rodar.sh monolito|servico|contatos|api|saude|testes
# versões: monolito servico contatos
set -e
cp="target/classes:target/lib/*"
case "$1" in
  monolito|servico)
    java -cp "$cp" morada.Main "$1" /dados/saida ;;
  contatos)
    java -cp "$cp" morada.Contatos /dados/saida ;;
  api)
    # nodelay: sem ele, o servidor HTTP embutido do JDK atrasa as respostas
    exec java -Dsun.net.httpserver.nodelay=true -cp "$cp" morada.Servico ;;
  saude)
    curl -sf -o /dev/null http://127.0.0.1:8080/saude ;;
  testes)
    mvn -q -o test && echo "testes OK" ;;
  *)
    echo "uso: monolito|servico|contatos|api|saude|testes" >&2; exit 1 ;;
esac
