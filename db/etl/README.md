# US Cities Database

This directory contains scripts to extract and manage US cities data from the world.sql database.

## Files

- `world.sql`: The original database containing cities, states, and countries from around the world
- `US.sql`: A filtered database containing only US cities, formatted for PostgreSQL
- `create_us_sql.py`: Python script to download world.sql and extract US cities

## Usage

### Creating the US.sql File

The `create_us_sql.py` script downloads the world.sql file (if it doesn't exist) and extracts all US cities into a PostgreSQL-compatible US.sql file:

```bash
python create_us_sql.py
```

### Using the US.sql File with PostgreSQL

Once the US.sql file is created, you can import it into a PostgreSQL database using psql:

```bash
psql -d your_database_name -f US.sql
```

### US.sql Structure

The US.sql file contains:

1. A DROP TABLE statement for the cities table
2. A CREATE TABLE statement for the cities table (PostgreSQL-compatible)
3. CREATE INDEX statements for state_id and country_id columns
4. INSERT statements for all US cities (19,813 cities)

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
- wikiDataId

## Notes

- The US country ID is 233 in the world.sql database
- The cities table has been completely rewritten to be PostgreSQL-compatible
- The cities table includes state_id references, which can be used to group cities by state
