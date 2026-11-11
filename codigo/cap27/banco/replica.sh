#!/bin/sh
# Monta a réplica: copia o primário e liga a replicação contínua, sempre passando pelo
# Toxiproxy, que é por onde o laboratório corta a rede entre os dois.
set -e
until pg_isready -h toxiproxy -p 5433 -U morada >/dev/null 2>&1; do sleep 1; done
rm -rf "$PGDATA"/*
until PGPASSWORD=replicador pg_basebackup -h toxiproxy -p 5433 -U replicador \
  -D "$PGDATA" -R -X stream
do
  rm -rf "$PGDATA"/*
  sleep 1
done
chown -R postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"
exec gosu postgres postgres
