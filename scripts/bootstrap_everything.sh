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
#   ./scripts/bootstrap_everything.sh <DATABASE_URL> [DATABASE_URL_TEST] [cities_sql_file]
#
# Example:
#   ./scripts/bootstrap_everything.sh "$DATABASE_URL" "$DATABASE_URL_TEST" ./scripts/cities_etl/output/US_with_timezone.sql
# =================================================================

set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check for database URL argument
if [ -z "$1" ]; then
    echo "Usage: $0 <DATABASE_URL> [DATABASE_URL_TEST] [cities_sql_file]"
    exit 1
fi
DATABASE_URL="$1"
DATABASE_URL_TEST="$2"

# Check if cities_sql_file is the third argument or second argument
if [ -n "$3" ]; then
    CITIES_SQL="$3"
elif [ -n "$2" ] && [[ "$2" == *".sql" ]]; then
    CITIES_SQL="$2"
    DATABASE_URL_TEST=""
else
    CITIES_SQL="$PROJECT_ROOT/scripts/cities_etl/output/US_with_timezone.sql"
fi

bootstrap_database() {
    local db_url="$1"
    local db_name="$2"
    
    echo "======================================================================"
    echo "Bootstrapping $db_name database with:"
    echo "- Schema application"
    echo "- Cities data from: $CITIES_SQL"
    echo "- Users data from: $SCRIPT_DIR/ingest-users/users.json"
    echo "======================================================================"

    # Step 1: Apply the schema
    echo -e "\n[1/3] Applying database schema to $db_name..."
    "$PROJECT_ROOT/backend/db/apply-schema.sh" "$db_url"

    # Step 2: Ingest cities data
    echo -e "\n[2/3] Ingesting cities data to $db_name..."
    "$SCRIPT_DIR/ingest-cities/ingest_ALL_cities.sh" "$db_url" "$CITIES_SQL"

    # Step 3: Ingest users data
    echo -e "\n[3/3] Ingesting users data to $db_name..."
    "$SCRIPT_DIR/ingest-users/ingest-users.sh" "$db_url"

    echo -e "\n======================================================================"
    echo "$db_name database bootstrap completed successfully!"
    echo "======================================================================"
}

# Bootstrap the main database
bootstrap_database "$DATABASE_URL" "Production"

# Bootstrap the test database if provided
if [ -n "$DATABASE_URL_TEST" ]; then
    echo -e "\n"
    bootstrap_database "$DATABASE_URL_TEST" "Test"
fi
