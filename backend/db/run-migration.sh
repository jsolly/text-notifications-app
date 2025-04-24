#!/bin/bash

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check for database URL argument
if [ -z "$1" ]; then
    echo "Usage: $0 <DATABASE_URL>"
    exit 1
fi
DATABASE_URL="$1"

# Run the migration
echo "Running database migration..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/migrations/001_update_calculate_utc_notification_time.sql"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
else
    echo "Error: Migration failed"
    exit 1
fi 