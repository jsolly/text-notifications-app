import type {
	Context,
	APIGatewayProxyEvent,
	EventBridgeEvent,
} from "aws-lambda";
import type pg from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getDbClient, closeDbClient } from "../shared/db.js";
// Use the test database if it exists
const NASA_API_KEY = process.env.NASA_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

interface NasaImageMetadata {
	date: string;
	explanation: string;
	media_type: string;
	title: string;
	url?: string;
}

async function getMetadataFromNasaImageOfTheDay(
	nasaApiKey: string,
): Promise<NasaImageMetadata> {
	const url = `https://api.nasa.gov/planetary/apod?api_key=${nasaApiKey}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`NASA API request failed with status: ${response.status}`);
	}

	const data = (await response.json()) as NasaImageMetadata;
	return {
		date: data.date,
		explanation: data.explanation,
		media_type: data.media_type,
		title: data.title,
		url: data.url,
	};
}

async function streamImageToS3(
	imageUrl: string,
	bucketName: string,
	objectKey: string,
	contentType = "image/jpeg",
): Promise<string> {
	const s3Client = new S3Client({
		region: process.env.AWS_REGION,
	});

	// Fetch the image data
	const response = await fetch(imageUrl);

	if (!response.ok) {
		throw new Error(`Failed to fetch image with status: ${response.status}`);
	}

	// Convert the response to an ArrayBuffer
	const imageData = await response.arrayBuffer();

	// Upload to S3
	await s3Client.send(
		new PutObjectCommand({
			Bucket: bucketName,
			Key: objectKey,
			Body: new Uint8Array(imageData),
			ContentType: contentType,
		}),
	);

	return objectKey;
}

// Helper to normalize date to 'YYYY-MM-DD' string
function normalizeDate(val: unknown): string {
	if (typeof val === "string") return val.slice(0, 10);
	if (val instanceof Date) return val.toISOString().slice(0, 10);
	throw new Error("Unexpected date value: " + String(val));
}

export const handler = async (
	event:
		| APIGatewayProxyEvent
		| EventBridgeEvent<"Scheduled Event", Record<string, unknown>>,
	context: Context,
): Promise<{
	statusCode: number;
	body: {
		message: string;
		metadata?: NasaImageMetadata;
		s3_object_id?: string;
		source?: string;
		status?: string;
	};
}> => {
	let dbClient: pg.PoolClient | null = null;
	try {
		// First, get today's NASA image metadata
		const imageMetadata = await getMetadataFromNasaImageOfTheDay(
			NASA_API_KEY as string,
		);
		const imageDate = imageMetadata.date;
		console.log(`Retrieved NASA APOD for date: ${imageDate}`);

		// Connect to the database
		dbClient = await getDbClient(DATABASE_URL as string);

		// Check if we already have this image date in the database
		const existingRecordResult = await (dbClient as pg.PoolClient).query(
			"SELECT date, title, explanation, media_type, original_url, s3_object_id FROM NASA_APOD WHERE date = $1",
			[imageDate],
		);

		// If we already have this record, return it immediately
		if (existingRecordResult.rows.length > 0) {
			const existingRecord = existingRecordResult.rows[0];
			console.log(
				`Found existing NASA APOD for ${imageDate}, skipping processing`,
			);

			return {
				statusCode: 409,
				body: {
					message: "NASA image already processed. Record already exists.",
					metadata: {
						date: normalizeDate(existingRecord.date),
						title: existingRecord.title,
						explanation: existingRecord.explanation,
						media_type: existingRecord.media_type,
						url: existingRecord.original_url,
					},
					s3_object_id: existingRecord.s3_object_id,
					source: "database",
				},
			};
		}

		// Since we didn't find a record for the fetched APOD date, let's add it to the database
		// and store the APOD image in S3
		console.log(`Processing new NASA APOD for ${imageDate}`);

		// Create a simple, deterministic key based on the date
		const objectKey = `nasa-apod/${imageDate}.${imageMetadata.media_type}`;

		// Stream the image directly to S3
		const s3ObjectId = await streamImageToS3(
			imageMetadata.url,
			process.env.APOD_IMAGE_BUCKET_NAME as string,
			objectKey,
		);
		console.log(`Streamed image to S3: ${s3ObjectId}`);

		// Insert new NASA metadata to database
		await (dbClient as pg.PoolClient).query(
			`
					INSERT INTO NASA_APOD (
					date, 
					title, 
					explanation, 
					media_type, 
					original_url,
					s3_object_id
					) VALUES ($1, $2, $3, $4, $5, $6)
					`,
			[
				imageMetadata.date,
				imageMetadata.title,
				imageMetadata.explanation,
				imageMetadata.media_type,
				imageMetadata.url,
				s3ObjectId,
			],
		);

		console.log(`Inserted new record for ${imageDate} into database`);

		return {
			statusCode: 200,
			body: {
				message: "NASA image processing complete",
				metadata: imageMetadata,
				s3_object_id: s3ObjectId,
				source: "nasa_api",
			},
		};
	} catch (e) {
		const error = e as Error;
		const errorMessage = `Error processing NASA image: ${error.message}`;
		console.log(errorMessage);
		return {
			statusCode: 500,
			body: {
				message: errorMessage,
				status: "error",
			},
		};
	} finally {
		if (dbClient) {
			await closeDbClient(dbClient);
			dbClient = null;
		}
	}
};

export default { handler };
