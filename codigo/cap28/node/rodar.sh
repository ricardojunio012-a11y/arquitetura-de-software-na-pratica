#!/bin/sh
# Uso: rodar.sh reservas|pagamento|testes
# versões: reservas pagamento
set -e
node="node --disable-warning=ExperimentalWarning"
case "$1" in
  reservas)
    $node src/reservas.ts /dados ;;
  pagamento)
    $node src/pagamento.ts /dados ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: reservas|pagamento|testes" >&2; exit 1 ;;
esac
