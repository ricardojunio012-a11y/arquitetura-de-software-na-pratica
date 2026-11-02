#!/bin/sh
# Uso: rodar.sh consumidor|provedor|testes|medir
# versões: consumidor provedor
set -e
case "$1" in
  consumidor)
    python -m morada.contrato.consumidor /dados/saida ;;
  provedor)
    python -m morada.contrato.provedor /dados/saida ;;
  testes)
    python -m pytest -q tests ;;
  medir)
    # Tempo de execução de cada camada da suíte, informado pelo pytest (sem contar a
    # partida da ferramenta). Varia de máquina para máquina.
    for camada in unidade integracao ponta_a_ponta; do
      tempo=$(python -m pytest -q "tests/test_$camada.py" | sed -n 's/.* in \([0-9.]*s\).*/\1/p')
      echo "$camada: $tempo"
    done ;;
  *)
    echo "uso: consumidor|provedor|testes|medir" >&2; exit 1 ;;
esac
