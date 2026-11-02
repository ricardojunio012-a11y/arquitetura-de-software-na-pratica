#!/bin/sh
# Uso: rodar.sh antes|depois|arquitetura|testes
set -e
case "$1" in
  antes|depois)
    python -m "morada.$1.main" /dados/entrada/comandos.json "/dados/saida/$1" ;;
  arquitetura)
    # O mesmo teste de arquitetura nas duas versões: antes deve falhar, depois passar
    echo "== antes"
    if lint-imports --config importlinter-antes.ini --no-cache; then
      echo "ERRO: a versão antes deveria violar a regra"; exit 1
    fi
    echo "== depois"
    lint-imports --config importlinter-depois.ini --no-cache
    echo "arquitetura: antes viola a fronteira; depois respeita" ;;
  testes)
    python -m pytest -q tests ;;
  *)
    echo "uso: antes|depois|arquitetura|testes" >&2; exit 1 ;;
esac
