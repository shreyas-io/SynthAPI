set -e

create_database() {
  database="$1"

  if psql --dbname postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$database'" | grep -q 1; then
    return
  fi

  psql --dbname postgres -c "CREATE DATABASE \"$database\""
}

create_database "${APPLICATION_DB_NAME:-mock_api_app}"
create_database "${API_GATEWAY_DB_NAME:-api_gateway}"
