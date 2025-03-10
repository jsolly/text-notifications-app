#!/bin/bash

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables
if [ -f .env ]; then
    source .env
elif [ -f "$SCRIPT_DIR/../../.env" ]; then
    source "$SCRIPT_DIR/../../.env"
fi

# Check if database URL is provided
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Check if users.json exists
if [ ! -f "$SCRIPT_DIR/users.json" ]; then
    echo "Error: users.json file not found"
    exit 1
fi

# Read the JSON file and escape it for SQL
JSON_DATA=$(cat "$SCRIPT_DIR/users.json" | sed "s/'/''/g")

# Execute the SQL function with logging
psql "$DATABASE_URL" -A -t << EOF
\echo -n 'Users before: '
SELECT COUNT(*) FROM users;

-- Execute the insert/update
SELECT insert_users_from_json('$JSON_DATA'::jsonb);

\echo -n 'Users after: '
SELECT COUNT(*) FROM users;
EOF

echo "Users have been successfully bootstrapped!" 