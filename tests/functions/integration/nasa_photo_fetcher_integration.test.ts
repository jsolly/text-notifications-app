import { describe, test, expect, beforeEach } from "vitest";
import { Client as PgClient } from "pg";
import * as AWS from "aws-sdk";
import { handler } from "../../../backend/functions/apod_photo_fetcher/dist/index";

const DATABASE_URL_TEST = process.env.DATABASE_URL_TEST;

// Run tests sequentially to avoid race conditions
describe("NASA Photo Fetcher Integration Tests", () => {
	beforeEach(async () => {
		// Setup clean database state before each test
		const client = new PgClient(DATABASE_URL_TEST);
		await client.connect();
		await client.query("DELETE FROM NASA_APOD");
		await client.end();
		console.log("Database cleared for test");
	});

	test("successful fetch and store @integration", async () => {
		// Run the handler to fetch from real NASA API and store in the DB
		const result = await handler(null, null);

		// Verify the result
		expect(result.statusCode).toBe(200);
		expect(result.body.message).toContain("NASA image processing complete");

		// Extract metadata from the response
		const imageMetadata = result.body.metadata;
		const s3ObjectId = result.body.s3_object_id;

		// Verify the metadata is valid
		expect(imageMetadata).toHaveProperty("date");
		expect(imageMetadata).toHaveProperty("title");
		expect(imageMetadata).toHaveProperty("explanation");
		expect(imageMetadata).toHaveProperty("media_type");
		expect(imageMetadata).toHaveProperty("url");

		// Verify the S3 object ID is valid
		expect(s3ObjectId).toBeTruthy();
		expect(s3ObjectId.startsWith("nasa-apod/")).toBe(true);
		expect(s3ObjectId.endsWith(".jpg")).toBe(true);

		// Verify the S3 object exists
		const s3Client = new AWS.S3();
		const bucketName = process.env.APOD_IMAGE_BUCKET_NAME;

		if (!bucketName) {
			console.warn("APOD_IMAGE_BUCKET_NAME not set, skipping S3 check");
		} else {
			try {
				const s3Response = await s3Client
					.headObject({
						Bucket: bucketName,
						Key: s3ObjectId,
					})
					.promise();

				expect(s3Response.ContentType).toBe("image/jpeg");
				expect(Number(s3Response.ContentLength)).toBeGreaterThan(0);
			} catch (e) {
				throw new Error(
					`S3 object verification failed: ${(e as Error).message}`,
				);
			}
		}

		// Verify the database record was created
		const client = new PgClient(DATABASE_URL_TEST);
		await client.connect();

		const today = new Date();
		const formattedDate = today.toISOString().split("T")[0]; // YYYY-MM-DD

		const records = await client.query(
			"SELECT * FROM NASA_APOD WHERE date = CURRENT_DATE",
		);

		expect(records.rows.length).toBe(1);
		const record = records.rows[0];

		// Verify the database record matches the API response
		expect(record.date.toISOString().split("T")[0]).toBe(imageMetadata.date);
		expect(record.title).toBe(imageMetadata.title);
		expect(record.explanation).toBe(imageMetadata.explanation);
		expect(record.media_type).toBe(imageMetadata.media_type);
		expect(record.original_url).toBe(imageMetadata.url);

		// Verify the S3 object ID in the database matches the one returned in the API response
		expect(record.s3_object_id).toBe(s3ObjectId);

		await client.end();
	});

	test("duplicate record handling @integration", async () => {
		// First call - create the first record
		const firstResult = await handler(null, null);
		expect(firstResult.statusCode).toBe(200);
		expect(firstResult.body.message).toContain(
			"NASA image processing complete",
		);

		// Second call - should find an existing record
		const result = await handler(null, null);

		// Verify the result of the second call is still successful
		expect(result.statusCode).toBe(200);
		expect(result.body.message).toContain("NASA image already processed");

		// Verify only one database record exists for today
		const client = new PgClient(DATABASE_URL_TEST);
		await client.connect();

		const countResult = await client.query(
			"SELECT COUNT(*) as count FROM NASA_APOD WHERE date = CURRENT_DATE",
		);

		const count = Number.parseInt(countResult.rows[0].count);
		expect(count).toBe(1);

		await client.end();
	});
});
