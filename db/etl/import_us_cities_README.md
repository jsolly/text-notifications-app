# US Cities Import Script

This script imports US cities data from the [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database) into your PostgreSQL database using the modern psycopg3 adapter.

## Prerequisites

1. Python 3.8+
2. PostgreSQL database with the Cities table created (as per schema.sql)
3. Python packages:
   - psycopg (v3.x)
   - requests
   - tqdm
   - timezonefinder (for advanced version)

## Installation

1. Install the required packages:

```bash
pip install -r requirements.txt
```

2. Configure database connection:

   Edit the import script file and update the database configuration variables:

```python
DB_NAME = "your_database"
DB_USER = "your_username"
DB_PASSWORD = "your_password"
DB_HOST = "localhost"
DB_PORT = "5432"
```

## Available Scripts

Two script versions are provided:

1. **Basic Version** (`import_us_cities.py`):
   - Uses state-based timezone mapping
   - Simpler implementation

2. **Advanced Version** (`import_us_cities_advanced.py`):
   - Uses TimezoneFinder for precise timezone determination based on coordinates
   - Falls back to state-based mapping when coordinates are invalid or TimezoneFinder fails
   - Provides detailed statistics on timezone determination methods

## Usage

Run either script:

```bash
python import_us_cities.py
```

or for the advanced version:

```bash
python import_us_cities_advanced.py
```

Both scripts will:

1. Download countries, states, and cities data from the repository
2. Filter for US data only
3. Map each city to a timezone (using different strategies)
4. Import the data into your database
5. Create an index on city_name and state_code for faster lookups

## Notes

- The scripts use psycopg3, the modern PostgreSQL adapter for Python
- Downloaded data is cached locally to avoid repeated downloads
- Cities are inserted in batches of 1000 to prevent memory issues
- Duplicate cities (based on city_name + country_code) are skipped

## Timezone Handling

### Basic Version

Uses a simplified state-to-timezone mapping that assigns a single timezone to each state.

### Advanced Version

Combines multiple approaches:

1. First tries TimezoneFinder to determine timezone based on latitude/longitude
2. Falls back to state-based mapping if TimezoneFinder fails
3. Validates timezones against the allowed list in the database schema

## Improvements and Known Limitations

- Some states span multiple timezones (e.g., Florida, Kentucky, Indiana), so the state-based approach is an approximation
- The TimezoneFinder approach can be more accurate but might be slower
- Both approaches validate timezones against the allowed list in the database schema
