set -e

create_database() {
  database="$1"

  if psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname = '$database'" | grep -q 1; then
    return
  fi

  psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE \"$database\""
}

create_database "mock_api_app"
create_database "api_gateway"
