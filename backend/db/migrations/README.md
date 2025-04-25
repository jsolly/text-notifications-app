# Database Migrations

This folder contains database migrations for the application.

## Available Migrations

- `001_update_calculate_utc_notification_time.sql`: Updates the calculate_utc_notification_time function to ensure proper timezone conversion

## Running Migrations

To run a migration, use the run-migration.sh script:

```bash
# From the project root
./backend/db/run-migration.sh "$DATABASE_URL" <migration-file>

# Example
./backend/db/run-migration.sh "$DATABASE_URL" 001_update_calculate_utc_notification_time.sql
```

If you're unsure which migrations are available, run the script without specifying a migration file:

```bash
./backend/db/run-migration.sh "$DATABASE_URL"
```

This will list all available migrations in the migrations directory.

## Creating New Migrations

To create a new migration:

1. Create a new SQL file in the migrations folder with the format `XXX_description.sql`
2. Update this README to document the new migration

Migrations should be idempotent when possible (safe to run multiple times).
