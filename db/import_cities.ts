#!/usr/bin/env node

/**
 * City Data Import Script
 *
 * This script downloads city data from the countries-states-cities-database
 * repository and transforms it to match our database schema.
 *
 * Usage:
 *   ts-node db/import_cities.ts [--limit=NUMBER] [--countries=US,CA,...]
 *
 * Options:
 *   --limit=NUMBER       Limit the number of cities to import per country
 *   --countries=X,Y,Z    Only import cities from specified country codes (comma-separated)
 *   --output=FILE        Output file (default: db/imported_cities.sql)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import { parse, UrlWithStringQuery } from "node:url";
import { program } from "commander";

// Define interfaces for our data
interface Country {
	name: string;
	iso2: string;
}

interface State {
	name: string;
	country_code: string;
	state_code: string;
}

interface City {
	name: string;
	country_code: string;
	state_code?: string;
	latitude: number;
	longitude: number;
}

interface TransformedCity {
	city_name: string;
	state_code: string | null;
	state_name: string | null;
	country_code: string;
	country_name: string;
	latitude: number;
	longitude: number;
	timezone: string;
}

interface ProgramOptions {
	limit?: number;
	countries?: string;
	output: string;
}

interface StateMap {
	[countryCode: string]: {
		[stateCode: string]: State;
	};
}

// Define command-line options
program
	.option(
		"--limit <number>",
		"Limit the number of cities per country",
		Number.parseInt,
	)
	.option(
		"--countries <list>",
		"Comma-separated list of country codes to import",
	)
	.option("--output <file>", "Output SQL file", "db/imported_cities.sql")
	.parse(process.argv);

const options = program.opts() as ProgramOptions;

// Base URL for raw data from the GitHub repository
const REPO_BASE_URL =
	"https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/";

// Define the files we need to download
const dataFiles = {
	countries: `${REPO_BASE_URL}json/countries.json`,
	states: `${REPO_BASE_URL}json/states.json`,
	cities: `${REPO_BASE_URL}json/cities.json`,
};

// Function to download a JSON file
async function downloadJSON<T>(url: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const options = parse(url);

		https
			.get(options, (response) => {
				let data = "";

				response.on("data", (chunk) => {
					data += chunk;
				});

				response.on("end", () => {
					try {
						resolve(JSON.parse(data) as T);
					} catch (error) {
						reject(
							new Error(
								`Failed to parse JSON from ${url}: ${(error as Error).message}`,
							),
						);
					}
				});
			})
			.on("error", (error) => {
				reject(new Error(`Failed to download ${url}: ${error.message}`));
			});
	});
}

// Function to get timezone from coordinates (simplified version)
function getTimezoneFromCoordinates(
	latitude: number,
	longitude: number,
): string {
	// This is a very simplified approach
	// In a real implementation, you might want to use a timezone API
	// or a more comprehensive mapping

	// For now, we'll just use US timezones as a demo
	if (longitude < -115) return "America/Los_Angeles"; // Pacific
	if (longitude < -100) return "America/Denver"; // Mountain
	if (longitude < -87) return "America/Chicago"; // Central
	return "America/New_York"; // Eastern
}

// Main function
async function main(): Promise<void> {
	console.log("Starting city import process...");

	try {
		// Download data
		console.log("Downloading country data...");
		const countries = await downloadJSON<Country[]>(dataFiles.countries);

		console.log("Downloading state data...");
		const states = await downloadJSON<State[]>(dataFiles.states);

		console.log("Downloading city data...");
		const cities = await downloadJSON<City[]>(dataFiles.cities);

		console.log(
			`Downloaded ${countries.length} countries, ${states.length} states, and ${cities.length} cities.`,
		);

		// Filter countries if specified
		let filteredCountries = countries;
		if (options.countries) {
			const countryCodes = options.countries
				.split(",")
				.map((code) => code.trim().toUpperCase());
			filteredCountries = countries.filter((country) =>
				countryCodes.includes(country.iso2),
			);
			console.log(
				`Filtering to ${filteredCountries.length} countries: ${countryCodes.join(", ")}`,
			);
		}

		// Create a lookup for states by country and state code
		const stateMap: StateMap = {};
		for (const state of states) {
			if (!stateMap[state.country_code]) {
				stateMap[state.country_code] = {};
			}
			stateMap[state.country_code][state.state_code] = state;
		}

		// Filter and transform cities
		const transformedCities: TransformedCity[] = [];

		for (const country of filteredCountries) {
			const countryCities = cities.filter(
				(city) => city.country_code === country.iso2,
			);

			// Limit number of cities per country if specified
			const citiesToProcess =
				options.limit && countryCities.length > options.limit
					? countryCities.slice(0, options.limit)
					: countryCities;

			if (options.limit && countryCities.length > options.limit) {
				console.log(
					`Limiting ${country.name} cities to ${options.limit} (from ${countryCities.length})`,
				);
			}

			for (const city of citiesToProcess) {
				// Get state information if available
				const stateCode = city.state_code;
				const stateName =
					stateCode &&
					stateMap[country.iso2] &&
					stateMap[country.iso2][stateCode]
						? stateMap[country.iso2][stateCode].name
						: null;

				// Transform city to match our schema
				transformedCities.push({
					city_name: city.name,
					state_code: stateCode || null,
					state_name: stateName,
					country_code: country.iso2,
					country_name: country.name,
					latitude: city.latitude,
					longitude: city.longitude,
					timezone: getTimezoneFromCoordinates(city.latitude, city.longitude),
				});
			}
		}

		console.log(
			`Transformed ${transformedCities.length} cities to match our schema.`,
		);

		// Generate SQL insert statements
		const insertStatements = transformedCities.map((city) => {
			return `INSERT INTO Cities (
        city_name,
        state_code,
        state_name,
        country_code,
        country_name,
        latitude,
        longitude,
        timezone
      ) VALUES (
        '${city.city_name.replace(/'/g, "''")}'',
        ${city.state_code ? `'${city.state_code}'` : "NULL"},
        ${city.state_name ? `'${city.state_name.replace(/'/g, "''")}'` : "NULL"},
        '${city.country_code}',
        '${city.country_name.replace(/'/g, "''")}',
        ${city.latitude},
        ${city.longitude},
        '${city.timezone}'
      );`;
		});

		// Create SQL file
		const sqlContent = `-- Generated Cities Import SQL
-- Generated on: ${new Date().toISOString()}
-- Total Cities: ${transformedCities.length}

${insertStatements.join("\n")}
`;

		fs.writeFileSync(options.output, sqlContent);
		console.log(`Successfully generated SQL file: ${options.output}`);
		console.log(
			`Import ${transformedCities.length} cities with: psql YOUR_DATABASE_URL -f ${options.output}`,
		);
	} catch (error) {
		console.error("Error during import process:", error);
		process.exit(1);
	}
}

// Run the script
main();
