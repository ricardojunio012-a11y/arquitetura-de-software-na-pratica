#!/bin/sh
# Roda na primeira inicialização: cria o usuário que o pg_basebackup usa e libera a
# conexão de replicação a partir da rede do Compose.
set -e
psql -v ON_ERROR_STOP=1 -U morada -d morada -c \
  "CREATE ROLE replicador WITH REPLICATION LOGIN PASSWORD 'replicador';"
echo "host replication replicador all scram-sha-256" >> "$PGDATA/pg_hba.conf"
