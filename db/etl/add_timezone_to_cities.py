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

    Returns:
        bool: True if successful, False otherwise
    """
    # Ensure paths are relative to the script directory
    script_dir = Path(__file__).parent
    input_path = script_dir / input_file
    output_path = script_dir / output_file

    print(f"Processing {input_path}...")

    try:
        # Read the SQL file
        with open(input_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Input file {input_path} not found.")
        return False
    except Exception as e:
        print(f"Error reading input file: {e}")
        return False

    # Extract the INSERT statement and values using a more precise regex
    insert_pattern = r'(INSERT INTO "cities"[^)]+\))\s*VALUES\s*\n(.*?);'
    insert_match = re.search(insert_pattern, content, re.DOTALL)

    if not insert_match:
        print("Could not find INSERT statement.")
        return False

    # Get the INSERT header and values directly from regex groups
    insert_header = insert_match.group(1)
    cities_values = insert_match.group(2).strip().split("),\n")

    # Remove the trailing parenthesis from the last item if it exists
    if cities_values[-1].endswith(")"):
        cities_values[-1] = cities_values[-1][:-1]

    # Update the INSERT header to include the timezone column
    # The original header looks like: INSERT INTO "cities" ("id", ..., "wikiDataId")
    # We need to add "timezone" as the last column in the list
    original_column_list = insert_header
    modified_column_list = original_column_list.replace(
        '"wikidata_id")',  # Find the last column in the original list
        '"wikidata_id", "timezone")',  # Replace with last column + new timezone column
    )

    # Initialize TimezoneFinder
    tf = TimezoneFinder()

    # Process each city to add timezone
    print(f"Adding timezone information to {len(cities_values)} cities...")
    modified_cities = []

    for city_value in tqdm(cities_values):
        try:
            # Split the city values
            parts = city_value.split(", ")

            # Extract latitude and longitude
            latitude = float(parts[6])
            longitude = float(parts[7])

            if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
                raise ValueError(
                    f"Invalid latitude or longitude: {latitude}, {longitude}"
                )
            # Get timezone for the coordinates
            timezone = tf.timezone_at(lat=latitude, lng=longitude)
            if timezone is None:
                raise ValueError(f"No timezone found for city: {city_value}")

            # Add timezone to the city value
            modified_cities.append(f"{city_value}, '{timezone}'")
        except (IndexError, ValueError) as e:
            print(f"Warning: Error processing city data: {e}")
            print(f"Problematic city data: {city_value}")
            raise e

    try:
        # Create the new SQL file
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(
                "-- SQL file with US cities data including timezone information\n\n"
            )

            # Write modified INSERT statement with VALUES keyword
            f.write(f"{modified_column_list} VALUES\n")

            # Write all cities with proper formatting
            if modified_cities:
                # Join all cities except the last one with commas
                if len(modified_cities) > 1:
                    f.write(",\n".join(f"{city})" for city in modified_cities[:-1]))
                    f.write(",\n")

                # Write the last city and close the statement
                f.write(f"{modified_cities[-1]});\n")
            else:
                print("Warning: No cities were processed. Output file may be invalid.")

        print(f"New SQL file with timezone information created at {output_path}")
        return True
    except Exception as e:
        print(f"Error writing output file: {e}")
        return False


def main():
    if add_timezone_to_cities():
        print("Timezone addition completed successfully.")
        print("The US_with_timezone.sql file is now ready for use with psql.")
    else:
        print("Failed to add timezone information.")


if __name__ == "__main__":
    main()
