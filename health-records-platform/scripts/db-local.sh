#!/usr/bin/env bash
# Runs a throwaway local PostgreSQL 16 cluster for development and tests.
# Data lives in .data/pg (git-ignored). Use docker-compose.yml instead if you prefer containers.
set -euo pipefail
cd "$(dirname "$0")/.."

PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PGDATA=".data/pg"
PORT="${PGPORT_LOCAL:-54329}"
RUN_AS=""
if [ "$(id -u)" = "0" ]; then RUN_AS="runuser -u postgres --"; fi

start() {
  mkdir -p .data
  if [ ! -d "$PGDATA" ]; then
    mkdir -p "$PGDATA"; [ -n "$RUN_AS" ] && chown -R postgres "$PGDATA" .data
    $RUN_AS "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
  fi
  if ! $RUN_AS "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    $RUN_AS "$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -l "$PGDATA/server.log" start >/dev/null
  fi
  for _ in $(seq 1 30); do "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1 && break; sleep 0.5; done
  psql -h 127.0.0.1 -p "$PORT" -U postgres -tc "select 1 from pg_database where datname='continuum'" | grep -q 1 \
    || psql -h 127.0.0.1 -p "$PORT" -U postgres -c "create database continuum" >/dev/null
  psql -h 127.0.0.1 -p "$PORT" -U postgres -tc "select 1 from pg_database where datname='continuum_test'" | grep -q 1 \
    || psql -h 127.0.0.1 -p "$PORT" -U postgres -c "create database continuum_test" >/dev/null
  echo "PostgreSQL running on 127.0.0.1:$PORT (databases: continuum, continuum_test)"
}

stop() { $RUN_AS "$PGBIN/pg_ctl" -D "$PGDATA" stop -m fast || true; }

case "${1:-start}" in start) start ;; stop) stop ;; *) echo "usage: $0 start|stop"; exit 1 ;; esac
