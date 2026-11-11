#!/bin/bash
# Lê os segredos que o cofre gerou e sobe o Keycloak importando o realm "morada".
# O arquivo do realm usa marcadores (${INTEGRACAO_SEGREDO}...) que o Keycloak troca
# pelas variáveis de ambiente na importação: nenhum segredo fica no repositório.
set -e
export INTEGRACAO_SEGREDO="$(cat /run/segredos/integracao)"
export ROTACAO_SEGREDO="$(cat /run/segredos/rotacao)"
export SENHA_USUARIOS="$(cat /run/segredos/senha_usuarios)"
exec /opt/keycloak/bin/kc.sh start-dev --import-realm
