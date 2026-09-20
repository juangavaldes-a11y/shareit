# Production Operations

## Secrets and TLS

Use a secrets manager to inject `POSTGRES_PASSWORD`, `JWT_SECRET`, and `METRICS_TOKEN` into the
deployment environment. Do not commit `.env.prod`. Terminate TLS at a managed ingress or load
balancer and forward `X-Forwarded-Proto`; the API trusts exactly one proxy hop in production.

Expose only the frontend port. Keep the backend and database on the internal Compose network.
Set `CORS_ORIGIN` to the exact public frontend origin, without wildcard values.

## Backups

Run the following from the repository root after exporting the database credentials from your
secrets manager. Schedule it from your platform scheduler and copy the encrypted output to
off-site object storage with lifecycle retention.

```bash
export POSTGRES_USER=shareit
export POSTGRES_DB=shareit
BACKUP_DIR=/secure/backups bash scripts/backup-postgres.sh
```

The backup job must be monitored for a nonzero exit code and a missing output file. Keep at least
one geographically separate copy.

## Restore Drill

Restore only into an isolated environment. Test a restore quarterly before relying on backups for
recovery:

```bash
export POSTGRES_USER=shareit
export POSTGRES_DB=shareit_restore
CONFIRM_RESTORE=shareit bash scripts/restore-postgres.sh backups/shareit-YYYYMMDDTHHMMSSZ.sql.gz
```

Verify application startup, migration state, listing counts, and a sample user login after each
drill. Record the recovery duration and investigate any gap against the recovery objective.

## Metrics

Scrape `GET /api/v1/metrics` with `Authorization: Bearer $METRICS_TOKEN`. Alert on sustained 5xx
responses, rising request latency, unavailable readiness checks, failed backups, and database disk
capacity. Correlate incidents through the `x-request-id` response header and structured API logs.