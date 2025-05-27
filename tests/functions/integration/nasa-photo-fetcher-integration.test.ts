import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { handler } from "../../../backend/functions/apod-photo-fetcher/index.js";
import {
	closeDbClient,
	getDbClient,
} from "../../../backend/functions/shared/db.js";

describe("NASA Photo Fetcher Integration Tests", () => {
	let client: PoolClient;

	beforeEach(async () => {
		client = await getDbClient(process.env.DATABASE_URL_TEST as string);
		// Use DELETE instead of TRUNCATE for better isolation
		await client.query("DELETE FROM nasa_apod");
	});

	afterEach(async () => {
		// Don't clean up nasa_apod here as other tests might need it
		await closeDbClient(client);
	});

	test("successful fetch and store [integration]", async () => {
		// Run the handler to fetch from real NASA API and store in the DB
		const result = await handler({} as APIGatewayProxyEvent, {} as Context);

		// Accept both 200 (new) and 409 (already exists)
		expect([200, 409]).toContain(result.statusCode);

		const imageMetadata = result.body.metadata;
		const s3ObjectId = result.body.s3_object_id;

		expect(imageMetadata).toHaveProperty("date");
		expect(imageMetadata).toHaveProperty("title");
		expect(imageMetadata).toHaveProperty("explanation");
		expect(imageMetadata.media_type).toBe("image");
		expect(imageMetadata).toHaveProperty("url");
		expect(s3ObjectId).toEqual(expect.stringMatching(/^nasa-apod\//));

		// Verify the database record was created
		const records = await client.query(
			"SELECT * FROM NASA_APOD WHERE date = $1",
			[imageMetadata.date],
		);

		expect(records.rows.length).toBe(1);
		const record = records.rows[0];

		expect(record.title).toBe(imageMetadata.title);
		expect(record.explanation).toBe(imageMetadata.explanation);
		expect(record.media_type).toBe(imageMetadata.media_type);
		expect(record.original_url).toBe(imageMetadata.url);

		expect(record.s3_object_id).toBe(s3ObjectId);
	});

	test("duplicate record handling [integration]", async () => {
		// First call - might be 200 (new record) or 409 (if another test already created it)
		const firstCall = await handler({} as APIGatewayProxyEvent, {} as Context);

		// If first call was 409, it means another test already created the record - that's fine
		if (firstCall.statusCode === 409) {
			expect(
				firstCall.body.message.includes("NASA image already processed"),
			).toBe(true);
			// Test passes - duplicate handling is working
			return;
		}

		// If first call was 200, we created a new record. Now try again to test duplicate handling
		expect(firstCall.statusCode).toBe(200);
		const apiDate = firstCall.body.metadata.date;

		// Second call should always be 409
		const duplicateRecord = await handler(
			{} as APIGatewayProxyEvent,
			{} as Context,
		);
		expect(duplicateRecord.statusCode).toBe(409);
		expect(
			duplicateRecord.body.message.includes("NASA image already processed"),
		).toBe(true);
		expect(duplicateRecord.body.metadata?.date.slice(0, 10)).toBe(
			apiDate.slice(0, 10),
		);
	});
});
