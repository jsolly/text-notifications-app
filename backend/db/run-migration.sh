#!/bin/bash

# =================================================================
# Script to run a specific database migration
#
# Usage:
#   ./backend/db/run-migration.sh "$DATABASE_URL" <migration-file>
#
# Parameters:
#   $1 - DATABASE_URL: The database connection string
#   $2 - migration-file: The migration file to run (e.g., 001_update_calculate_utc_notification_time.sql)
#
# Examples:
#   ./backend/db/run-migration.sh "$DATABASE_URL" 001_update_calculate_utc_notification_time.sql
#   ./backend/db/run-migration.sh "postgres://user:pass@localhost:5432/mydb" 001_update_calculate_utc_notification_time.sql
# =================================================================

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check for database URL argument
if [ -z "$1" ]; then
    echo "Error: Missing database URL"
    echo "Usage: $0 <DATABASE_URL> <migration-file>"
    echo "Example: $0 \"postgres://user:pass@localhost:5432/mydb\" 001_update_calculate_utc_notification_time.sql"
    exit 1
fi
DATABASE_URL="$1"

# Check for migration file argument
if [ -z "$2" ]; then
    echo "Error: Missing migration file"
    echo "Usage: $0 <DATABASE_URL> <migration-file>"
    echo "Available migrations:"
    ls -1 "$SCRIPT_DIR/migrations" | grep "\.sql$"
    exit 1
fi
MIGRATION_FILE="$2"

# Check if migration file exists
if [ ! -f "$SCRIPT_DIR/migrations/$MIGRATION_FILE" ]; then
    echo "Error: Migration file '$MIGRATION_FILE' not found in $SCRIPT_DIR/migrations/"
    echo "Available migrations:"
    ls -1 "$SCRIPT_DIR/migrations" | grep "\.sql$"
    exit 1
fi

# Run the migration
echo "Running database migration: $MIGRATION_FILE"
psql "$DATABASE_URL" -f "$SCRIPT_DIR/migrations/$MIGRATION_FILE"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
else
    echo "Error: Migration failed"
    exit 1
fi 