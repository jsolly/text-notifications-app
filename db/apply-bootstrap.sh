#!/bin/bash

# =================================================================
# Script to add a sample city to the database
#
# Usage:
#   ./apply-bootstrap.sh
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

echo "Adding a sample city to the database..."

# Apply the SQL script
psql "${DATABASE_URL}" -f "$SCRIPT_DIR/bootstrap.sql"

echo "Sample city added to the database." 