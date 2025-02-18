#!/bin/bash

# =================================================================
# Script to seed database tables with initial data for either 
# development or production environment.
#
# Usage:
#   ./db/seed_tables.sh [--env <environment>]
#
# Options:
#   --env    Specify the environment (dev or prod)
#            Default: dev
#
# Examples:
#   ./db/seed_tables.sh              # Seed development database
#   ./db/seed_tables.sh --env prod   # Seed production database
#
# Note: 
#   - Requires .env file with DATABASE_URL_DEV and/or DATABASE_URL
#   - Make sure to run this script from the project root directory
# =================================================================

# Exit on error
set -e

# Default to dev environment
ENV="dev"

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --env) ENV="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

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

echo "Seeding database tables in $ENV environment..."

# Apply the seed data
psql "${DB_URL}" -f db/tables.sql

echo "Database seeding completed successfully!"
