import { PostgresAdapter, PostgresDialect } from "kysely";

export class CockroachAdapter extends PostgresAdapter {
  async acquireMigrationLock(): Promise<void> {
    // No-op for CockroachDB to avoid pg_advisory_xact_lock() error
  }
  async releaseMigrationLock(): Promise<void> {
    // No-op
  }
}

export class CockroachDialect extends PostgresDialect {
  createAdapter() {
    return new CockroachAdapter();
  }
}
