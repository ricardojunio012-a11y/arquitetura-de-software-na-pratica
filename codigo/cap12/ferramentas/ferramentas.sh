#!/bin/sh
# Ferramentas do laboratório do capítulo 12.
#   verificar monolito|servico|contatos   compara saida/<versão> com o resultado aprovado
#   comparar                     mostra lado a lado as medições das duas versões
set -e
uso="uso: verificar monolito|servico|contatos | comparar"

case "$1" in
  verificar)
    versao="$2"
    case "$versao" in
      monolito|servico|contatos) ;;
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
  comparar)
    # Os tempos variam de máquina para máquina; por isso ficam fora da verificação
    for v in monolito servico; do
      echo "== $v"
      cat "saida/tempos-$v.txt"
    done ;;
  *)
    echo "$uso" >&2; exit 1 ;;
esac
