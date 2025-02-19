#!/bin/bash

# =================================================================
# Script to set up database: apply schema and/or seed data for either 
# development or production environment.
#
# Usage:
#   ./db/setup-db.sh [--env <environment>] [--schema] [--seed]
#
# Options:
#   --env     Specify the environment (dev or prod)
#             Default: dev
#   --schema  Apply the database schema
#   --seed    Seed the database with initial data
#
# If neither --schema nor --seed is specified, both operations will
# be performed.
#
# Examples:
#   ./db/setup-db.sh                     # Apply schema and seed (dev)
#   ./db/setup-db.sh --env prod          # Apply schema and seed (prod)
#   ./db/setup-db.sh --schema            # Only apply schema (dev)
#   ./db/setup-db.sh --seed --env prod   # Only seed data (prod)
#
# Note: 
#   - Requires .env file with DATABASE_URL_DEV and/or DATABASE_URL
#   - Make sure to run this script from the project root directory
# =================================================================

# Exit on error
set -e

# Default values
ENV="dev"
DO_SCHEMA=false
DO_SEED=false

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --env) ENV="$2"; shift ;;
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

# Make sure to run this script from the root directory
if [ -f .env ]; then
    source .env
fi

# Select the appropriate database URL based on environment
if [ "$ENV" = "prod" ]; then
    DB_URL="${DATABASE_URL}"
else
    DB_URL="${DATABASE_URL_DEV:-$DATABASE_URL}"
fi

if [ -z "$DB_URL" ]; then
    echo "Error: No database URL configured for $ENV environment"
    exit 1
fi

# Apply schema if requested
if [ "$DO_SCHEMA" = true ]; then
    echo "Applying schema to $ENV environment..."
    psql "${DB_URL}" -f db/schema.sql
    echo "Schema applied successfully!"
    echo "=== Tables in database ==="
    psql "${DB_URL}" -c "\dt"
    echo
fi

# Seed data if requested
if [ "$DO_SEED" = true ]; then
    echo "Seeding database tables in $ENV environment..."
    psql "${DB_URL}" -f db/tables.sql
    echo "Database seeding completed successfully!"
fi

echo "All requested database operations completed!" 