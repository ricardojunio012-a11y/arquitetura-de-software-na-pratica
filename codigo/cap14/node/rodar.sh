#!/bin/sh
# Uso: rodar.sh consumidor|provedor|testes|medir
# versões: consumidor provedor
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  consumidor)
    $node src/contrato/consumidor.ts /dados/saida ;;
  provedor)
    $node src/contrato/provedor.ts /dados/saida ;;
  testes)
    # Um arquivo por vez: os testes de integração dividem o mesmo banco
    npx tsc && npx vitest run --no-file-parallelism ;;
  medir)
    # Tempo de execução de cada camada da suíte, informado pelo vitest (sem contar a
    # partida da ferramenta). Varia de máquina para máquina.
    for camada in unidade integracao ponta-a-ponta; do
      tempo=$(NO_COLOR=1 npx vitest run "test/$camada.test.ts" |
        sed -n 's/.*tests \([0-9.]*m\{0,1\}s\).*/\1/p')
      echo "$camada: $tempo"
    done ;;
  *)
    echo "uso: consumidor|provedor|testes|medir" >&2; exit 1 ;;
esac
