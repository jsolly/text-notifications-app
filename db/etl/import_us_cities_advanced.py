#!/usr/bin/env python3
"""
Advanced script to import US cities from the countries-states-cities-database
using TimezoneFinder for precise timezone determination based on coordinates.
Uses psycopg3 for database connectivity.
"""

import os
import requests
import psycopg
from psycopg.rows import dict_row
import json
from tqdm import tqdm
from timezonefinder import TimezoneFinder

# Initialize TimezoneFinder
tf = TimezoneFinder()

# Configuration
DB_NAME = "your_database"
DB_USER = "your_username"
DB_PASSWORD = "your_password"
DB_HOST = "localhost"
DB_PORT = "5432"

# URLs for raw JSON data
COUNTRIES_URL = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/countries.json"
STATES_URL = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/states.json"
CITIES_URL = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/cities.json"

# Fallback timezone mapping for when TimezoneFinder fails
STATE_TIMEZONE_MAP = {
    "AL": "America/Chicago",
    "AK": "America/Anchorage",
    "AZ": "America/Phoenix",
    "AR": "America/Chicago",
    "CA": "America/Los_Angeles",
    "CO": "America/Denver",
    "CT": "America/New_York",
    "DE": "America/New_York",
    "FL": "America/New_York",
    "GA": "America/New_York",
    "HI": "Pacific/Honolulu",
    "ID": "America/Denver",
    "IL": "America/Chicago",
    "IN": "America/Indiana/Indianapolis",
    "IA": "America/Chicago",
    "KS": "America/Chicago",
    "KY": "America/Kentucky/Louisville",
    "LA": "America/Chicago",
    "ME": "America/New_York",
    "MD": "America/New_York",
    "MA": "America/New_York",
    "MI": "America/Detroit",
    "MN": "America/Chicago",
    "MS": "America/Chicago",
    "MO": "America/Chicago",
    "MT": "America/Denver",
    "NE": "America/Chicago",
    "NV": "America/Los_Angeles",
    "NH": "America/New_York",
    "NJ": "America/New_York",
    "NM": "America/Denver",
    "NY": "America/New_York",
    "NC": "America/New_York",
    "ND": "America/Chicago",
    "OH": "America/New_York",
    "OK": "America/Chicago",
    "OR": "America/Los_Angeles",
    "PA": "America/New_York",
    "RI": "America/New_York",
    "SC": "America/New_York",
    "SD": "America/Chicago",
    "TN": "America/Chicago",
    "TX": "America/Chicago",
    "UT": "America/Denver",
    "VT": "America/New_York",
    "VA": "America/New_York",
    "WA": "America/Los_Angeles",
    "WV": "America/New_York",
    "WI": "America/Chicago",
    "WY": "America/Denver",
    "DC": "America/New_York",
}


def download_json(url, filename):
    """Download JSON data from URL and save to file if not exists."""
    if os.path.exists(filename):
        print(f"Loading {filename} from local cache...")
        with open(filename, "r") as f:
            return json.load(f)

    print(f"Downloading {url}...")
    response = requests.get(url)
    data = response.json()

    # Save to cache file
    with open(filename, "w") as f:
        json.dump(data, f)

    return data


def get_timezone(lat, lng, state_code):
    """
    Get timezone from coordinates using TimezoneFinder.
    Fall back to state-based mapping if TimezoneFinder fails.
    """
    try:
        timezone = tf.timezone_at(lat=lat, lng=lng)
        if timezone:
            return timezone
    except Exception as e:
        print(f"TimezoneFinder error: {e}")

    # Fallback to state-based mapping
    return STATE_TIMEZONE_MAP.get(state_code, "America/New_York")


def validate_timezone(timezone):
    """
    Validate that the timezone is one of the accepted ones in the database.
    Return America/New_York if not valid.
    """
    valid_timezones = {
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Phoenix",
        "America/Anchorage",
        "America/Adak",
        "Pacific/Honolulu",
        "America/Indiana/Indianapolis",
        "America/Kentucky/Louisville",
        "America/Detroit",
        "America/Boise",
        "America/Menominee",
    }

    return timezone if timezone in valid_timezones else "America/New_York"


def connect_to_db():
    """Connect to PostgreSQL database using psycopg3."""
    try:
        conninfo = f"dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD} host={DB_HOST} port={DB_PORT}"
        conn = psycopg.connect(conninfo)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        exit(1)


def main():
    # Track statistics
    stats = {
        "total_processed": 0,
        "timezone_by_coords": 0,
        "timezone_by_state": 0,
        "timezone_default": 0,
    }

    # Download and process data
    print("Downloading and processing data...")

    # Get countries data
    countries = download_json(COUNTRIES_URL, "countries.json")

    # Find US country info
    us_country = None
    for country in countries:
        if country["iso2"] == "US":
            us_country = country
            break

    if not us_country:
        print("Error: Could not find US in countries data!")
        exit(1)

    print(f"Found US country data: {us_country['name']}")
    us_id = us_country["id"]

    # Get states data
    states = download_json(STATES_URL, "states.json")

    # Filter for US states
    us_states = {}
    for state in states:
        if state["country_id"] == us_id:
            us_states[state["id"]] = {
                "name": state["name"],
                "state_code": state["state_code"],
            }

    print(f"Found {len(us_states)} US states")

    # Get cities data (this can be large)
    print("Downloading cities data (this may take a while)...")
    cities = download_json(CITIES_URL, "cities.json")

    # Filter for US cities
    us_cities = []
    for city in tqdm(cities, desc="Processing cities"):
        state_id = city.get("state_id")
        if state_id in us_states:
            stats["total_processed"] += 1
            state = us_states[state_id]
            state_code = state["state_code"]

            # Convert latitude and longitude to float
            try:
                lat = float(city["latitude"])
                lng = float(city["longitude"])
            except (ValueError, TypeError):
                print(
                    f"Warning: Invalid coordinates for {city['name']}, using defaults"
                )
                lat, lng = 0.0, 0.0

            # Determine timezone based on coordinates
            timezone = get_timezone(lat, lng, state_code)

            # Track which method was used
            if timezone == STATE_TIMEZONE_MAP.get(state_code, "America/New_York"):
                if (
                    timezone == "America/New_York"
                    and state_code not in STATE_TIMEZONE_MAP
                ):
                    stats["timezone_default"] += 1
                else:
                    stats["timezone_by_state"] += 1
            else:
                stats["timezone_by_coords"] += 1

            # Validate timezone against our allowed list
            timezone = validate_timezone(timezone)

            us_cities.append(
                (
                    city["name"],  # city_name
                    state_code,  # state_code
                    state["name"],  # state_name
                    "US",  # country_code
                    us_country["name"],  # country_name
                    lat,  # latitude
                    lng,  # longitude
                    timezone,  # timezone
                )
            )

    print(f"Found {len(us_cities)} US cities")
    print(f"Timezone statistics:")
    print(f"  - Determined by coordinates: {stats['timezone_by_coords']}")
    print(f"  - Determined by state: {stats['timezone_by_state']}")
    print(f"  - Using default: {stats['timezone_default']}")

    # Connect to database
    conn = connect_to_db()

    # Insert data into Cities table
    print("Inserting data into database...")

    # Process in batches to avoid memory issues
    batch_size = 1000
    for i in range(0, len(us_cities), batch_size):
        batch = us_cities[i : i + batch_size]

        # Using psycopg3's approach for batch inserts
        with conn.cursor() as cur:
            # Create placeholders for all the batch rows
            placeholders = ", ".join(
                cur.mogrify("(%s,%s,%s,%s,%s,%s,%s,%s)", city).decode("utf-8")
                for city in batch
            )

            insert_query = f"""
                INSERT INTO Cities (city_name, state_code, state_name, country_code, country_name, latitude, longitude, timezone)
                VALUES {placeholders}
                ON CONFLICT (city_name, country_code) DO NOTHING;
            """
            cur.execute(insert_query)
            conn.commit()

        print(
            f"Inserted batch {i // batch_size + 1}/{(len(us_cities) + batch_size - 1) // batch_size}"
        )

    # Get count of inserted cities
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM Cities WHERE country_code = 'US';")
        count = cur.fetchone()[0]
        print(f"Total US cities in database: {count}")

    # Create index if it doesn't exist
    print("Creating index on city_name and state_code...")
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_cities_name_state 
                ON Cities (city_name, state_code);
            """)
            conn.commit()
    except Exception as e:
        print(f"Error creating index: {e}")

    # Close connection
    conn.close()
    print("Import complete!")


if __name__ == "__main__":
    main()
