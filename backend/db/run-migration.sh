#!/bin/bash

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables
if [ -f "$SCRIPT_DIR/../.env" ]; then
    source "$SCRIPT_DIR/../.env"
fi

# Check if database URL is provided
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Run the migration
echo "Running database migration..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/migrations/001_update_insert_users_function.sql"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
else
    echo "Error: Migration failed"
    exit 1
fi 