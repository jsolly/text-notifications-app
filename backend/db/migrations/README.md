# Database Migrations

This folder contains database migrations for the application.

## Available Migrations

- `001_update_calculate_utc_notification_time.sql`: Updates the calculate_utc_notification_time function to ensure proper timezone conversion

## Running Migrations

To run the migration, use the run-migration.sh script:

```bash
# From the project root
./backend/db/run-migration.sh
```

This will run the migration to update the calculate_utc_notification_time function.

## Creating New Migrations

To create a new migration:

1. Create a new SQL file in the migrations folder with the format `XXX_description.sql`
2. Update the `run-migration.sh` script to include the new migration
3. Update this README to document the new migration

Migrations should be idempotent when possible (safe to run multiple times).
