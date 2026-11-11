#!/bin/sh
# Monta a réplica de leitura: copia o primário com pg_basebackup e liga a replicação
# contínua. O recovery_min_apply_delay atrasa de propósito a aplicação das mudanças em
# 2 segundos, para o atraso de replicação ficar visível no laboratório.
set -e
until pg_isready -h primario -U morada >/dev/null 2>&1; do sleep 1; done
rm -rf "$PGDATA"/*
until PGPASSWORD=replicador pg_basebackup -h primario -U replicador -D "$PGDATA" -R -X stream
do
  rm -rf "$PGDATA"/*
  sleep 1
done
echo "recovery_min_apply_delay = '2s'" >> "$PGDATA/postgresql.auto.conf"
chown -R postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"
exec gosu postgres postgres
