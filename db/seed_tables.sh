#!/bin/bash

# Exit on error
set -e

# Make sure to run this script from the root directory
if [ -f .env ]; then
    source .env
fi

echo "Seeding database tables..."

# Apply the seed data using DATABASE_URL
psql "${DATABASE_URL}" -f db/tables.sql

echo "Database seeding completed successfully!"
