#!/bin/sh
# Sobe o PostgreSQL com o arquivamento contínuo do WAL ligado. O archive_command
# recusa sobrescrever um arquivo que já existe, como recomenda a documentação.
# archive_timeout=0: um segmento só é arquivado quando enche ou quando alguém pede
# (pg_switch_wal), o que deixa o RPO do cenário "desastre" previsível.
set -e
mkdir -p /arquivo
chown postgres:postgres /arquivo
exec docker-entrypoint.sh postgres \
  -c wal_level=replica \
  -c archive_mode=on \
  -c "archive_command=test ! -f /arquivo/%f && cp %p /arquivo/%f" \
  -c archive_timeout=0
