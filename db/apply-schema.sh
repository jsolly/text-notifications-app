#!/bin/bash

# =================================================================
# Script to apply database schema
#
# Usage:
#   ./db/apply-schema.sh
#
# Note: 
#   - Requires .env file with DATABASE_URL
#   - Make sure to run this script from the project root directory
# =================================================================

# Load environment variables
if [ -f .env ]; then
    source .env
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not configured"
    exit 1
fi

echo "Applying schema..."

# Apply the schema
psql "${DATABASE_URL}" -f db/schema.sql 

# List all tables to verify
echo "\n=== Listing all tables in the database ==="
psql "${DATABASE_URL}" -c "\dt" 
