#!/bin/sh
# FR-O3 / skill rule 3: Grafana's Postgres datasource gets a READ-ONLY role,
# never the app/admin user. Runs once on a fresh data volume (Postgres only
# executes /docker-entrypoint-initdb.d on an empty PGDATA).
#
# This runs before the app's Alembic migrations, so no tables exist yet. The
# real grant is ALTER DEFAULT PRIVILEGES: any table later created by the app
# user ($POSTGRES_USER) is automatically SELECT-able by the Grafana role.
set -e

: "${GRAFANA_DB_USER:=grafana_ro}"

if [ -z "${GRAFANA_DB_PASSWORD}" ]; then
  echo "10-grafana-readonly: GRAFANA_DB_PASSWORD not set — skipping read-only role." >&2
  exit 0
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	DO \$\$
	BEGIN
	  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${GRAFANA_DB_USER}') THEN
	    CREATE ROLE ${GRAFANA_DB_USER} LOGIN PASSWORD '${GRAFANA_DB_PASSWORD}';
	  END IF;
	END
	\$\$;

	GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${GRAFANA_DB_USER};
	GRANT USAGE ON SCHEMA public TO ${GRAFANA_DB_USER};
	GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${GRAFANA_DB_USER};
	ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
	  GRANT SELECT ON TABLES TO ${GRAFANA_DB_USER};
EOSQL

echo "10-grafana-readonly: ensured read-only role '${GRAFANA_DB_USER}'."
