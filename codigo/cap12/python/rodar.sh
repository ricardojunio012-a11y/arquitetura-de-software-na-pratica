#!/bin/sh
# Uso: rodar.sh monolito|servico|contatos|api|saude|testes
# versões: monolito servico contatos
set -e
case "$1" in
  monolito|servico)
    python -m morada.main "$1" /dados/saida ;;
  contatos)
    python -m morada.contatos /dados/saida ;;
  api)
    exec python -m morada.servico ;;
  saude)
    python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8080/saude', timeout=2)" ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: monolito|servico|contatos|api|saude|testes" >&2; exit 1 ;;
esac
