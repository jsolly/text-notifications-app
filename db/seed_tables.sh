#!/bin/bash

# Exit on error
set -e

# Source environment variables if .env exists
if [ -f .env ]; then
    source .env
fi

echo "Seeding database tables..."

# Apply the seed data using DATABASE_URL
psql "${DATABASE_URL}" -f tables.sql

echo "Database seeding completed successfully!"
