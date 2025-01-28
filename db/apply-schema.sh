#!/bin/bash

if [ -f .env ]; then
    source .env
fi

# Apply the schema
psql "${DATABASE_URL}" -f schema.sql 

# List all tables to verify
echo "\n=== Listing all tables in the database ==="
psql "${DATABASE_URL}" -c "\dt" 
