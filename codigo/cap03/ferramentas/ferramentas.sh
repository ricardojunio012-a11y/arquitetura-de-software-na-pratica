#!/bin/sh
# Ferramentas do laboratório do capítulo 3.
#   verificar antes|depois   compara saida/<versão> com o resultado aprovado
#   medir [linguagem]        mede acoplamento e ciclos (padrão: $LINGUAGEM; "todas" mede as quatro)
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
    if diff -ru esperado "saida/$versao"; then
      echo "OK: a saída de $versao é idêntica ao resultado aprovado."
    else
      echo "FALHOU: a saída de $versao difere do resultado aprovado." >&2
      exit 1
    fi ;;
  medir)
    python3 ferramentas/dependencias.py "${2:-$LINGUAGEM}" ;;
  *)
    echo "uso: verificar antes|depois | medir [node|php|python|java|todas]" >&2; exit 1 ;;
esac
