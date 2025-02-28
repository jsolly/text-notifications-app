import re
from pathlib import Path
from timezonefinder import TimezoneFinder
from tqdm import tqdm


def add_timezone_to_cities(input_file="US.sql", output_file="US_with_timezone.sql"):
    """
    Read the US.sql file, add timezone information for each city based on coordinates,
    and generate a new SQL file with the timezone column added to the INSERT statements.

    Args:
        input_file: Path to the original US.sql file
        output_file: Path to save the new SQL file with timezone information
    """
    # Ensure paths are relative to the script directory
    script_dir = Path(__file__).parent
    input_path = script_dir / input_file
    output_path = script_dir / output_file

    print(f"Processing {input_path}...")

    # Initialize TimezoneFinder
    tf = TimezoneFinder()

    # Read the SQL file
    with open(input_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract the CREATE TABLE statement
    create_table_pattern = r'CREATE TABLE "cities" \([^;]+\);'
    create_table_match = re.search(create_table_pattern, content, re.DOTALL)

    if not create_table_match:
        print("Could not find cities table creation statement.")
        return False

    create_table_stmt = create_table_match.group(0)

    # Modify the CREATE TABLE statement to add the timezone column
    modified_create_table = create_table_stmt.replace(
        '"wikiDataId" VARCHAR(255)',
        '"wikiDataId" VARCHAR(255),\n                "timezone" VARCHAR(50)',
    )

    # Extract the INSERT statement and values
    insert_pattern = r'INSERT INTO "cities".*?VALUES\s*\n(.*?);'
    insert_match = re.search(insert_pattern, content, re.DOTALL)

    if not insert_match:
        print("Could not find INSERT statement.")
        return False

    insert_header = content[
        insert_match.start() : insert_match.start()
        + content[insert_match.start() :].find("\n")
        + 1
    ]

    # Update the INSERT header to include the timezone column
    modified_insert_header = insert_header.replace(
        '"wikiDataId"', '"wikiDataId", "timezone"'
    )

    # Extract all city values
    cities_values = insert_match.group(1).strip().split("),\n")
    if cities_values[-1].endswith(")"):
        # Remove the trailing parenthesis from the last item if it exists
        cities_values[-1] = cities_values[-1][:-1]

    # Process each city to add timezone
    print(f"Adding timezone information to {len(cities_values)} cities...")
    modified_cities = []

    # Compile the regex pattern once, outside the loop
    lat_long_pattern = re.compile(r"'([-\d.]+)'.*?'([-\d.]+)'")

    for city_value in tqdm(cities_values):
        # Extract latitude and longitude using regex
        lat_long_match = lat_long_pattern.search(city_value)

        if lat_long_match:
            latitude = float(lat_long_match.group(1))
            longitude = float(lat_long_match.group(2))

            # Get timezone for the coordinates
            timezone = tf.timezone_at(lat=latitude, lng=longitude)

            # Add timezone to the city value
            modified_city = f"{city_value}, '{timezone}'"
            modified_cities.append(modified_city)
        else:
            print(f"Warning: Could not extract coordinates from: {city_value}")
            # Add a default timezone as fallback
            modified_city = f"{city_value}, 'America/New_York'"
            modified_cities.append(modified_city)

    # Create the new SQL file
    with open(output_path, "w", encoding="utf-8") as f:
        # Write drop table statement
        f.write('DROP TABLE IF EXISTS "cities";\n\n')

        # Write modified CREATE TABLE statement
        f.write(modified_create_table + "\n\n")

        # Write the indexes
        f.write('CREATE INDEX "cities_state_id_idx" ON "cities" ("state_id");\n')
        f.write('CREATE INDEX "cities_country_id_idx" ON "cities" ("country_id");\n')
        f.write('CREATE INDEX "cities_timezone_idx" ON "cities" ("timezone");\n\n')

        # Write modified INSERT statement
        f.write(modified_insert_header)

        # Write all cities except the last one
        for i, city in enumerate(modified_cities):
            if i < len(modified_cities) - 1:
                f.write(city + "),\n")
            else:
                # Last city
                f.write(city + ");\n")

    print(f"New SQL file with timezone information created at {output_path}")
    return True


def main():
    if add_timezone_to_cities():
        print("Timezone addition completed successfully.")
        print("The US_with_timezone.sql file is now ready for use with psql.")
    else:
        print("Failed to add timezone information.")


if __name__ == "__main__":
    main()
