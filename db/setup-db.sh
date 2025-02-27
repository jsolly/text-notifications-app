#!/bin/bash

# Change to the script's directory
cd "$(dirname "$0")"

# =================================================================
# Script to set up database: apply schema and/or seed users
#
# Usage:
#   ./db/setup-db.sh [--schema] [--seed]
#
# Options:
#   --schema  Apply the database schema
#   --seed    Seed the database with initial users
#
# If neither --schema nor --seed is specified, both operations will
# be performed.
#
# Examples:
#   ./db/setup-db.sh           # Apply schema and seed
#   ./db/setup-db.sh --schema  # Only apply schema
#   ./db/setup-db.sh --seed    # Only seed users
#
# Note: 
#   - Requires .env file with DATABASE_URL
#   - Make sure to run this script from the project root directory
# =================================================================

# Exit on error
set -e

# Default values
DO_SCHEMA=false
DO_SEED=false

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --schema) DO_SCHEMA=true ;;
        --seed) DO_SEED=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# If neither operation is specified, do both
if [ "$DO_SCHEMA" = false ] && [ "$DO_SEED" = false ]; then
    DO_SCHEMA=true
    DO_SEED=true
fi

# Load environment variables
if [ -f ../.env ]; then
    source ../.env
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not configured"
    exit 1
fi

# Apply schema if requested
if [ "$DO_SCHEMA" = true ]; then
    echo "Applying schema..."
    psql "${DATABASE_URL}" -f schema.sql
    echo "Schema applied successfully!"
    echo "=== Tables in database ==="
    psql "${DATABASE_URL}" -c "\dt"
    echo
fi

# Seed users if requested
if [ "$DO_SEED" = true ]; then
    echo "Seeding Users..."
    psql "${DATABASE_URL}" -f users.sql
    echo "Database seeding completed successfully!"
fi

echo "All requested database operations completed!" 