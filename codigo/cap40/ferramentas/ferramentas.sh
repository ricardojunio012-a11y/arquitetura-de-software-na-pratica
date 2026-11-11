#!/bin/sh
# Ferramentas do laboratório do capítulo 40.
#   verificar unidade|crescimento|cfo|compromisso
#       compara saida/<versão> com o resultado aprovado
set -e
uso="uso: verificar unidade|crescimento|cfo|compromisso"

case "$1" in
  verificar)
    versao="$2"
    case "$versao" in
      unidade|crescimento|cfo|compromisso) ;;
      *) echo "$uso" >&2; exit 1 ;;
    esac
    if [ ! -d "saida/$versao" ]; then
      echo "saida/$versao não existe: rode antes 'docker compose run --rm app $versao'" >&2
      exit 1
    fi
    if diff -ru "esperado/$versao" "saida/$versao"; then
      echo "OK: a saída de $versao é idêntica ao resultado aprovado."
    else
      echo "FALHOU: a saída de $versao difere do resultado aprovado." >&2
      exit 1
    fi ;;
  *)
    echo "$uso" >&2; exit 1 ;;
esac
