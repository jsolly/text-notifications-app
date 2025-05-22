import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
	getDbClient,
	closeDbClient,
} from "../../../backend/functions/shared/db.js";
import { handler } from "../../../backend/functions/apod-photo-fetcher/index.js";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import type { PoolClient } from "pg";

describe("NASA Photo Fetcher Integration Tests", () => {
	let client: PoolClient;

	beforeEach(async () => {
		client = await getDbClient(process.env.DATABASE_URL_TEST as string);
	});

	afterEach(async () => {
		await closeDbClient(client);
	});

	test("successful fetch and store [integration]", async () => {
		// Run the handler to fetch from real NASA API and store in the DB
		const result = await handler({} as APIGatewayProxyEvent, {} as Context);

		expect(result.statusCode).toBe(200);

		expect(result.body.message.includes("NASA image processing complete")).toBe(
			true,
		);

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
		// --- query the API to see if there's already a record for today ---
		const preFlightCall = await handler(
			{} as APIGatewayProxyEvent,
			{} as Context,
		);
		const apiDate = preFlightCall.body.metadata?.date;

		if (preFlightCall.body.message?.includes("NASA image already processed")) {
			expect(preFlightCall.statusCode).toBe(409); // Expect 409 if already processed
		} else {
			expect(preFlightCall.statusCode).toBe(200); // Expect 200 if not already processed
		}

		if (preFlightCall.statusCode === 200) {
			// --- Scenario 1: No duplicate record found, (a new one was added) so let's create a duplicate
			const duplicateRecord = await handler(
				{} as APIGatewayProxyEvent,
				{} as Context,
			);
			expect(duplicateRecord.statusCode).toBe(409);
			expect(
				duplicateRecord.body.message.includes("NASA image already processed"),
			).toBe(true);
			expect(duplicateRecord.body.metadata?.date).toBe(apiDate);
		}
	});
});
