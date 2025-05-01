#!/bin/bash

# =================================================================
# Bootstrap script to set up the entire database
# 
# This script will:
# 1. Apply the database schema
# 2. Ingest all cities data
# 3. Ingest all users data
#
# Usage:
#   ./scripts/bootstrap_everything.sh <DATABASE_URL> [cities_sql_file]
#
# Example:
#   ./scripts/bootstrap_everything.sh "$DATABASE_URL" ./scripts/cities_etl/output/US_with_timezone.sql
# =================================================================

set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check for database URL argument
if [ -z "$1" ]; then
    echo "Usage: $0 <DATABASE_URL> [cities_sql_file]"
    exit 1
fi
DATABASE_URL="$1"

# Set default cities SQL file path or use provided argument
CITIES_SQL="${2:-$PROJECT_ROOT/scripts/cities_etl/output/US_with_timezone.sql}"

echo "======================================================================"
echo "Bootstrapping database with:"
echo "- Schema application"
echo "- Cities data from: $CITIES_SQL"
echo "- Users data from: $SCRIPT_DIR/ingest-users/users.json"
echo "======================================================================"

# Step 1: Apply the schema
echo -e "\n[1/3] Applying database schema..."
"$PROJECT_ROOT/backend/db/apply-schema.sh" "$DATABASE_URL"

# Step 2: Ingest cities data
echo -e "\n[2/3] Ingesting cities data..."
"$SCRIPT_DIR/ingest-cities/ingest_ALL_cities.sh" "$DATABASE_URL" "$CITIES_SQL"

# Step 3: Ingest users data
echo -e "\n[3/3] Ingesting users data..."
"$SCRIPT_DIR/ingest-users/ingest-users.sh" "$DATABASE_URL"

echo -e "\n======================================================================"
echo "Database bootstrap completed successfully!"
echo "======================================================================"
