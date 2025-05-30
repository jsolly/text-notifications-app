#!/bin/bash

# =================================================================
# Script to ingest US cities with timezone data into the database
# This script assumes the cities table already exists in the database
#
# Usage:
#   ./scripts/ingest-cities/ingest_ALL_cities.sh <DATABASE_URL> <path_to_sql_file>
#
# Example using DATABASE_URL from .env:
#   ./scripts/ingest-cities/ingest_ALL_cities.sh "$DATABASE_URL" ./scripts/cities_etl/output/US_with_timezone.sql
#
# =================================================================

# Check if both arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <DATABASE_URL> <path_to_sql_file>"
    exit 1
fi

DATABASE_URL="$1"
SQL_PATH="$2"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if the SQL file exists
if [ ! -f "$SQL_PATH" ]; then
    echo "Error: SQL file not found at $SQL_PATH"
    exit 1
fi

# Get the count of cities before ingestion
echo "Checking current city count in database..."
BEFORE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM cities WHERE country_code = 'US';")
BEFORE_COUNT=$(echo $BEFORE_COUNT | xargs) # Trim whitespace
echo "Current US cities count: $BEFORE_COUNT"

echo "Ingesting cities data from $SQL_PATH into database..."

# Execute the SQL file using psql with DATABASE_URL
psql "$DATABASE_URL" -f "$SQL_PATH"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo "Cities data successfully ingested into the database."
    
    # Verify the count of cities after ingestion
    echo "Verifying city count after ingestion..."
    AFTER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM cities WHERE country_code = 'US';")
    AFTER_COUNT=$(echo $AFTER_COUNT | xargs) # Trim whitespace
    echo "US cities count after ingestion: $AFTER_COUNT"
    
    # Calculate the difference
    if [ "$BEFORE_COUNT" -eq "$AFTER_COUNT" ] && [ "$BEFORE_COUNT" -ne "0" ]; then
        echo "Warning: No new cities were added. The table might already contain US cities."
    else
        ADDED=$((AFTER_COUNT - BEFORE_COUNT))
        echo "Successfully added $ADDED new US cities to the database."
    fi
    
    # Show a sample of cities with timezones
    echo -e "\nSample of US cities with timezones:"
    psql "$DATABASE_URL" -c "SELECT id, name, state_code, timezone FROM cities WHERE country_code = 'US' ORDER BY RANDOM() LIMIT 5;"
else
    echo "Error: Failed to ingest cities data into the database."
    exit 1
fi

echo "Ingest process completed." 