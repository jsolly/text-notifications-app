#!/bin/bash

# =================================================================
# Script to apply database schema
#
# Usage:
#   ./apply-schema.sh
#
# Note: 
#   - Requires .env file with DATABASE_URL
#   - Can be run from any directory. Assumes schema.sql is in the db directory
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

echo "Applying schema..."

# Apply the schema using the script directory to locate schema.sql
psql "${DATABASE_URL}" -f "$SCRIPT_DIR/schema.sql"

# List all tables to verify
echo "\n=== Listing all tables in the database ==="
psql "${DATABASE_URL}" -c "\dt" 
