#!/bin/bash

# =================================================================
# Script to import cities data from the GitHub repository
#
# Usage:
#   ./db/import_cities.sh [--limit=NUMBER] [--countries=US,CA,...]
#
# Options:
#   --limit=NUMBER       Limit the number of cities to import per country
#   --countries=X,Y,Z    Only import cities from specified country codes (comma-separated)
#   --no-import          Generate SQL file but don't import to database
# =================================================================

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
    source .env
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not configured"
    exit 1
fi

# Parse arguments
IMPORT_TO_DB=true
NODE_ARGS=""

for arg in "$@"; do
    if [[ "$arg" == "--no-import" ]]; then
        IMPORT_TO_DB=false
    else
        NODE_ARGS="$NODE_ARGS $arg"
    fi
done

# Install commander package if not already installed
if ! npm list commander &> /dev/null; then
    echo "Installing required npm packages..."
    npm install commander
fi

# Create the output directory if it doesn't exist
mkdir -p db

# Run the Node.js script to generate the SQL file
echo "Generating cities SQL file..."
node db/import_cities.js $NODE_ARGS

# Import the SQL file into the database
if [ "$IMPORT_TO_DB" = true ]; then
    echo "Importing cities to database..."
    psql "${DATABASE_URL}" -f db/imported_cities.sql
    echo "Cities imported successfully!"
else
    echo "SQL file generated at db/imported_cities.sql"
    echo "To import manually, run: psql ${DATABASE_URL} -f db/imported_cities.sql"
fi