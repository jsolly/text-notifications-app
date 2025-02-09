#!/bin/bash

# Make sure to run this script from the root directory
if [ -f .env ]; then
    source .env
fi

# Apply the schema
psql "${DATABASE_URL}" -f db/schema.sql 

# List all tables to verify
echo "\n=== Listing all tables in the database ==="
psql "${DATABASE_URL}" -c "\dt" 
