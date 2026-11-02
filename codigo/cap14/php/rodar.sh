#!/bin/sh
# Uso: rodar.sh consumidor|provedor|testes|medir
# versões: consumidor provedor
set -e
case "$1" in
  consumidor)
    php src/contrato/consumidor.php /dados/saida ;;
  provedor)
    php src/contrato/provedor.php /dados/saida ;;
  testes)
    vendor/bin/phpunit --colors=always tests ;;
  medir)
    # Tempo de execução de cada camada da suíte, informado pelo PHPUnit (sem contar a
    # partida da ferramenta). Varia de máquina para máquina.
    for camada in Unidade Integracao PontaAPonta; do
      tempo=$(vendor/bin/phpunit "tests/${camada}Test.php" | sed -n 's/^Time: \(.*\), Memory.*/\1/p')
      echo "$camada: $tempo"
    done ;;
  *)
    echo "uso: consumidor|provedor|testes|medir" >&2; exit 1 ;;
esac
