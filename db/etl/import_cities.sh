#!/bin/bash
# Shell script to run the US cities import process

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Ask which script to run
echo ""
echo "Which script would you like to run?"
echo "1) Basic version (state-based timezone mapping)"
echo "2) Advanced version (coordinate-based timezone mapping with TimezoneFinder)"
read -p "Enter choice (1 or 2): " script_choice

# Set database connection variables
DB_NAME=""
DB_USER=""
DB_PASSWORD=""
DB_HOST="localhost"
DB_PORT="5432"

# Prompt for database connection details
read -p "Database name: " DB_NAME
read -p "Database user: " DB_USER
read -p "Database password: " DB_PASSWORD
read -p "Database host (default: localhost): " DB_HOST_INPUT
read -p "Database port (default: 5432): " DB_PORT_INPUT

# Use defaults if not provided
if [ ! -z "$DB_HOST_INPUT" ]; then
  DB_HOST="$DB_HOST_INPUT"
fi

if [ ! -z "$DB_PORT_INPUT" ]; then
  DB_PORT="$DB_PORT_INPUT"
fi

# Update database connection in script files
echo "Updating database connection details..."
sed -i.bak "s/DB_NAME = \"your_database\"/DB_NAME = \"$DB_NAME\"/" import_us_cities.py
sed -i.bak "s/DB_USER = \"your_username\"/DB_USER = \"$DB_USER\"/" import_us_cities.py
sed -i.bak "s/DB_PASSWORD = \"your_password\"/DB_PASSWORD = \"$DB_PASSWORD\"/" import_us_cities.py
sed -i.bak "s/DB_HOST = \"localhost\"/DB_HOST = \"$DB_HOST\"/" import_us_cities.py
sed -i.bak "s/DB_PORT = \"5432\"/DB_PORT = \"$DB_PORT\"/" import_us_cities.py

# Also update advanced script if it exists
if [ -f "import_us_cities_advanced.py" ]; then
  sed -i.bak "s/DB_NAME = \"your_database\"/DB_NAME = \"$DB_NAME\"/" import_us_cities_advanced.py
  sed -i.bak "s/DB_USER = \"your_username\"/DB_USER = \"$DB_USER\"/" import_us_cities_advanced.py
  sed -i.bak "s/DB_PASSWORD = \"your_password\"/DB_PASSWORD = \"$DB_PASSWORD\"/" import_us_cities_advanced.py
  sed -i.bak "s/DB_HOST = \"localhost\"/DB_HOST = \"$DB_HOST\"/" import_us_cities_advanced.py
  sed -i.bak "s/DB_PORT = \"5432\"/DB_PORT = \"$DB_PORT\"/" import_us_cities_advanced.py
fi

# Run the selected script
if [ "$script_choice" = "1" ]; then
  echo "Running basic import script..."
  python import_us_cities.py
elif [ "$script_choice" = "2" ]; then
  echo "Running advanced import script with TimezoneFinder..."
  python import_us_cities_advanced.py
else
  echo "Invalid choice. Exiting."
  exit 1
fi

# Clean up backup files
rm -f import_us_cities.py.bak import_us_cities_advanced.py.bak

echo "Import process complete!"
deactivate 