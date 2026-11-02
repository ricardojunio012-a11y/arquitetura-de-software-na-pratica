#!/bin/sh
# Ferramentas do laboratório do capítulo 8.
#   verificar camadas|plugins   compara saida/<parte> com o resultado aprovado
set -e

case "$1" in
  verificar)
    parte="$2"
    case "$parte" in
      camadas|plugins) ;;
      *) echo "uso: verificar camadas|plugins" >&2; exit 1 ;;
    esac
    if [ ! -d "saida/$parte" ]; then
      echo "saida/$parte não existe: rode antes 'docker compose run --rm app $parte'" >&2
      exit 1
    fi
    if diff -ru "esperado/$parte" "saida/$parte"; then
      echo "OK: a saída de $parte é idêntica ao resultado aprovado."
    else
      echo "FALHOU: a saída de $parte difere do resultado aprovado." >&2
      exit 1
    fi ;;
  *)
    echo "uso: verificar camadas|plugins" >&2; exit 1 ;;
esac
