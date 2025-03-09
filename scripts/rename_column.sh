#!/bin/bash

# =================================================================
# Script to rename a column in the database
#
# Usage:
#   ./rename_column.sh
#
# Note: 
#   - Requires .env file with DATABASE_URL
#   - Can be run from any directory
# =================================================================

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables
if [ -f .env ]; then
    source .env
elif [ -f "$SCRIPT_DIR/../.env" ]; then
    source "$SCRIPT_DIR/../.env"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not configured"
    exit 1
fi

echo "Renaming column in the database..."

# Apply the SQL script and check for errors
if ! psql "${DATABASE_URL}" -f "$SCRIPT_DIR/rename_column.sql"; then
  echo "Error: Column rename operation failed."
  exit 1
fi

echo "Column rename operation completed." 