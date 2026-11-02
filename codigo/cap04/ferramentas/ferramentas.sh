#!/bin/sh
# Ferramentas do laboratório do capítulo 4.
#   verificar antes|depois   compara saida/<versão> com o resultado aprovado para o $GATEWAY
set -e

case "$1" in
  verificar)
    versao="$2"
    case "$versao" in
      antes|depois) ;;
      *) echo "uso: verificar antes|depois" >&2; exit 1 ;;
    esac
    if [ ! -d "saida/$versao" ]; then
      echo "saida/$versao não existe: rode antes 'docker compose run --rm app $versao'" >&2
      exit 1
    fi
    if diff -ru "esperado/$GATEWAY" "saida/$versao"; then
      echo "OK: a saída de $versao é idêntica ao resultado aprovado ($GATEWAY)."
    else
      echo "FALHOU: a saída de $versao difere do resultado aprovado ($GATEWAY)." >&2
      exit 1
    fi ;;
  *)
    echo "uso: verificar antes|depois" >&2; exit 1 ;;
esac
