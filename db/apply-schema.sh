#!/bin/bash

# =================================================================
# Script to apply database schema to either development or production
# environment.
#
# Usage:
#   ./db/apply-schema.sh [--env <environment>]
#
# Options:
#   --env    Specify the environment (dev or prod)
#            Default: dev
#
# Examples:
#   ./db/apply-schema.sh              # Apply to development database
#   ./db/apply-schema.sh --env prod   # Apply to production database
#
# Note: 
#   - Requires .env file with DATABASE_URL_DEV and/or DATABASE_URL
#   - Make sure to run this script from the project root directory
# =================================================================

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

echo "Applying schema to $ENV environment..."

# Apply the schema
psql "${DB_URL}" -f db/schema.sql 

# List all tables to verify
echo "\n=== Listing all tables in the database ==="
psql "${DB_URL}" -c "\dt" 
