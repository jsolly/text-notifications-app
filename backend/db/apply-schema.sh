#!/bin/bash

# =================================================================
# Script to apply database schema
#
# Usage:
#   ./backend/db/apply-schema.sh "$DATABASE_URL"
#
# Note:
#   - Pass the database connection string as the first argument
#   - Can be run from any directory. Assumes schema.sql is in the db directory
#   - Example using DATABASE_URL from .env:
#     ./backend/db/apply-schema.sh "$DATABASE_URL"
#
# =================================================================

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check for database URL argument
if [ -z "$1" ]; then
    echo "Usage: $0 <DATABASE_URL>"
    exit 1
fi
DATABASE_URL="$1"

echo "Applying schema..."

# Apply the schema using the script directory to locate schema.sql
psql "$DATABASE_URL" -f "$SCRIPT_DIR/schema.sql"

# List all tables to verify
echo "\n=== Listing all tables in the database ==="
psql "$DATABASE_URL" -c "\dt" 
