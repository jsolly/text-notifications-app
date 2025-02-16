import { describe, expect, it, beforeEach } from "vitest";
import { lambdaHandler } from "../functions/signup-processor/index";
import { getDbClient } from "../functions/signup-processor/db";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import testEvent from "../events/test-event.json";

async function clearDatabase() {
	const client = await getDbClient();
	try {
		await client.query("DELETE FROM Users");
	} finally {
		await client.end();
	}
}

describe("Signup Processor Lambda", () => {
	beforeEach(async () => {
		await clearDatabase();
	});

	it("processes signup form submission", async () => {
		const event = testEvent as unknown as APIGatewayProxyEvent;
		const context = {} as Context;

		const result = await lambdaHandler(event, context);
		expect(result.statusCode).toBe(200);

		// Response is actually HTML
		expect(result.body).toContain("Sign-up successful!");
	});

	it("Prevents duplicate signups", async () => {
		const event = testEvent as unknown as APIGatewayProxyEvent;
		const context = {} as Context;

		// First signup should succeed
		const firstResult = await lambdaHandler(event, context);
		expect(firstResult.statusCode).toBe(200);

		// Second signup with same data should fail
		const secondResult = await lambdaHandler(event, context);
		expect(secondResult.statusCode).toBe(409);
		expect(secondResult.body).toContain(
			"A user with that phone number already exists.",
		);
	});
});
