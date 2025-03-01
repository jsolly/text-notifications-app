# US Cities Database

This directory contains scripts to extract and manage US cities data from the world.sql database.

## Files

- `world.sql`: The original database containing cities, states, and countries from around the world (psql dump)
- `US.sql`: A filtered database containing only US cities, formatted for PostgreSQL
- `create_us_sql.py`: Python script to download world.sql and extract US cities
- `add_timezone_to_cities.py`: Python script to add timezone information to the cities table. It goes through each city and uses the `timezonefinder` library to find the timezone.

## Usage

### Creating the US.sql File

The `create_us_sql.py` script downloads the world.sql file (if it doesn't exist) and extracts all US cities into a PostgreSQL-compatible US.sql file:

```sh
python create_us_sql.py
```

### Adding Timezone Information

The `add_timezone_to_cities.py` script goes through each city and uses the `timezonefinder` library to find the timezone:

```sh
python add_timezone_to_cities.py
```

### Using the US_with_timezone.sql File with PostgreSQL

Once the US_with_timezone.sql file is created, you can import it into a PostgreSQL database using psql:

```sh
psql -d your_database_name -f US_with_timezone.sql
```

### US_with_timezone Structure

The US_with_timezone.sql file contains:

- INSERT statements for all US cities (19,813 cities)
- A timezone column added to match the cities table for this application (see db/schema.sql)

Each city entry includes:

- id
- name
- state_id
- state_code
- country_id (always 233 for US)
- country_code (always 'US')
- latitude
- longitude
- created_at
- updated_at
- flag
- wikidata_id (renamed from wikiDataId because neon lowercases column names)
- timezone
