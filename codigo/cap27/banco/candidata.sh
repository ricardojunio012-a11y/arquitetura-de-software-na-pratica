#!/bin/sh
# Monta a candidata: uma segunda réplica, que o cenário "promocao" promove a líder no
# meio de uma partição. Depois do cenário, o laboratório cria a tabela "reconstruir"
# na candidata promovida; este laço percebe, para o banco, apaga tudo e copia de novo
# o primário, para que a próxima execução comece de uma réplica limpa.
set -e
while true; do
  until pg_isready -h toxiproxy -p 5434 -U morada >/dev/null 2>&1; do sleep 1; done
  rm -rf "$PGDATA"/*
  until PGPASSWORD=replicador pg_basebackup -h toxiproxy -p 5434 -U replicador \
    -D "$PGDATA" -R -X stream
  do
    rm -rf "$PGDATA"/*
    sleep 1
  done
  chown -R postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  gosu postgres postgres &
  until [ "$(PGPASSWORD=morada psql -h 127.0.0.1 -U morada -d morada -tAc \
    "SELECT to_regclass('public.reconstruir') IS NOT NULL" 2>/dev/null)" = "t" ]
  do
    sleep 1
  done
  gosu postgres pg_ctl -D "$PGDATA" stop -m fast
  wait
done
