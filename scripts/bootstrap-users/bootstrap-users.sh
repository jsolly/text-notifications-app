#!/bin/bash

# =================================================================
# Script to bootstrap users into the database
#
# Usage:
#   ./scripts/bootstrap-users/bootstrap-users.sh <DATABASE_URL>
#
# Example using DATABASE_URL from .env:
#   ./scripts/bootstrap-users/bootstrap-users.sh "$DATABASE_URL"
#
# =================================================================

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check for database URL argument
if [ -z "$1" ]; then
    echo "Usage: $0 <DATABASE_URL>"
    exit 1
fi
DATABASE_URL="$1"

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