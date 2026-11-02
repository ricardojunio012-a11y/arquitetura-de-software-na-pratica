#!/bin/sh
# Uso: rodar.sh antes|depois|arquitetura|esquemas|testes
set -e
case "$1" in
  antes|depois)
    node --disable-warning=ExperimentalWarning "src/$1/main.ts" \
      /dados/entrada/comandos.json "/dados/saida/$1" ;;
  arquitetura)
    # O mesmo teste de arquitetura nas duas versões: antes deve falhar, depois passar
    echo "== antes"
    if npx depcruise src/antes --config .dependency-cruiser.cjs --output-type err; then
      echo "ERRO: a versão antes deveria violar a regra"; exit 1
    fi
    echo "== depois"
    npx depcruise src/depois --config .dependency-cruiser.cjs --output-type err
    echo "arquitetura: antes viola a fronteira; depois respeita" ;;
  esquemas)
    # Só em TypeScript: o banco, e não um import, impede o atalho entre módulos
    node --disable-warning=ExperimentalWarning src/esquemas/main.ts \
      /dados/entrada/comandos.json /dados/saida/esquemas ;;
  testes)
    npx tsc && npx vitest run ;;
  *)
    echo "uso: antes|depois|arquitetura|esquemas|testes" >&2; exit 1 ;;
esac
