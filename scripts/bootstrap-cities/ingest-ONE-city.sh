#!/bin/bash

# =================================================================
# Script to add a sample city to the database
#
# Usage:
#   ./scripts/bootstrap-cities/seed-ONE-city.sh <DATABASE_URL>
#
# Note:
#   - Can be run from any directory
# =================================================================

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check for database URL argument
if [ -z "$1" ]; then
    echo "Usage: $0 <DATABASE_URL>"
    exit 1
fi
DATABASE_URL="$1"

echo "Adding a sample city to the database..."

# Apply the SQL script
psql "$DATABASE_URL" -f "$SCRIPT_DIR/bootstrap-cities/ingest-ONE-city.sql"

echo "Sample city added to the database." 