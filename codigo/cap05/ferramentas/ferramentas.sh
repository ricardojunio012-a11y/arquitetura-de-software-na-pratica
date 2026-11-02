#!/bin/sh
# Ferramentas do laboratório do capítulo 5.
#   verificar reservas   compara saida/reservas com o resultado aprovado
set -e

case "$1" in
  verificar)
    if [ ! -d saida/reservas ]; then
      echo "saida/reservas não existe: rode antes 'docker compose run --rm app reservas'" >&2
      exit 1
    fi
    if diff -ru esperado saida/reservas; then
      echo "OK: a saída é idêntica ao resultado aprovado."
    else
      echo "FALHOU: a saída difere do resultado aprovado." >&2
      exit 1
    fi ;;
  *)
    echo "uso: verificar reservas" >&2; exit 1 ;;
esac
