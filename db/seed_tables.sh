#!/bin/bash

# =================================================================
# Script to seed database tables with initial data
#
# Usage:
#   ./db/seed_tables.sh
#
# Note: 
#   - Requires .env file with DATABASE_URL
#   - Make sure to run this script from the project root directory
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

echo "Seeding database tables..."

# Apply the seed data
psql "${DATABASE_URL}" -f db/tables.sql

echo "Database seeding completed successfully!"
