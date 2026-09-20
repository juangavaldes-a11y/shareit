#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: CONFIRM_RESTORE=shareit bash scripts/restore-postgres.sh <backup.sql.gz>" >&2
  exit 1
fi

if [[ ${CONFIRM_RESTORE:-} != shareit ]]; then
  echo "Refusing restore. Set CONFIRM_RESTORE=shareit after verifying the target database." >&2
  exit 1
fi

BACKUP_FILE=$1
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
ENV_FILE=${ENV_FILE:-.env.prod}
PROJECT_NAME=${PROJECT_NAME:-shareit}

test -f "$BACKUP_FILE"

gzip -dc "$BACKUP_FILE" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" \
  exec -T db psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Restore completed from: $BACKUP_FILE"