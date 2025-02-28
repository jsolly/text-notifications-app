import requests
import re
from pathlib import Path
from tqdm import tqdm

# URL for raw SQL file
SQL_URL = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/refs/heads/master/psql/world.sql"


def download_sql_file(output_path="world.sql"):
    """Download the SQL file from GitHub repository if it doesn't already exist."""
    # Ensure the output path is relative to the script directory
    script_dir = Path(__file__).parent
    full_output_path = script_dir / output_path

    # Check if file already exists
    if full_output_path.exists():
        print(f"File already exists at {full_output_path}. Skipping download.")
        return full_output_path

    print(f"Downloading SQL file from {SQL_URL}...")

    response = requests.get(SQL_URL, stream=True)
    response.raise_for_status()

    total_size = int(response.headers.get("content-length", 0))

    # Use tqdm for progress reporting
    with open(full_output_path, "wb") as f:
        with tqdm(
            total=total_size, unit="B", unit_scale=True, desc="Downloading"
        ) as pbar:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    pbar.update(len(chunk))

    print("Download complete!")
    return full_output_path


def extract_us_cities(input_file="world.sql", output_file="US.sql"):
    """
    Extract US cities from world.sql and create a new SQL file with only US cities.
    The output file contains only INSERT statements for seeding an existing cities table.

    Args:
        input_file: Path to the world.sql file
        output_file: Path to save the US cities SQL file
    """
    # Ensure paths are relative to the script directory
    script_dir = Path(__file__).parent
    input_path = script_dir / input_file
    output_path = script_dir / output_file

    if not input_path.exists():
        print(f"Input file {input_path} does not exist.")
        raise FileNotFoundError(f"Input file {input_path} does not exist.")

    print(f"Extracting US cities from {input_path}...")

    # Read the SQL file and extract necessary parts
    with open(input_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract US cities
    # Pattern to match city entries with country_id 233 (US)
    us_cities_pattern = re.compile(
        r"\([^)]*?, [^)]*?, [^)]*?, [^)]*?, 233, 'US'[^)]*?\)"
    )
    us_cities = us_cities_pattern.findall(content)

    print(f"Found {len(us_cities)} US cities.")

    # Create the US.sql file
    with open(output_path, "w", encoding="utf-8") as f:
        # Write comment header
        f.write("-- SQL file to seed existing cities table with US cities data\n\n")

        # Write US cities data (excluding the numeric flag column before wikidata_id)
        f.write(
            'INSERT INTO "cities" ("id", "name", "state_id", "state_code", "country_id", "country_code", "latitude", "longitude", "created_at", "updated_at", "wikidata_id") VALUES\n'
        )

        # Write all cities except the last one
        for i, city in enumerate(us_cities):
            # Remove the numeric flag column before wikidata_id
            city = re.sub(
                r"(, '[\d-]+ [\d:]+', '[\d-]+ [\d:]+'), \d+(, '[^']*')",
                r"\1\2",
                city,
            )

            if i < len(us_cities) - 1:
                f.write(city + ",\n")
            else:
                # Last city doesn't need a comma
                f.write(city + ";\n")

    print(f"US cities SQL file created at {output_path}")
    return True


def main():
    # Download world.sql if it doesn't exist
    download_sql_file()

    # Extract US cities from world.sql
    if extract_us_cities():
        print("US cities extraction completed successfully.")
        print("The US.sql file is now ready for use with psql.")
    else:
        print("Failed to extract US cities.")


if __name__ == "__main__":
    main()
