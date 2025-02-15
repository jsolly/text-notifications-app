import { describe, expect, it } from "vitest";
import { lambdaHandler } from "../functions/signup-processor/index";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import testEvent from "../events/test-event.json";

describe("Signup Processor Lambda", () => {
	it("processes signup form submission", async () => {
		const event = testEvent as unknown as APIGatewayProxyEvent;
		const context = {} as Context;

		const result = await lambdaHandler(event, context);
		expect(result.statusCode).toBe(200);

		// Response is actually HTML
		expect(result.body).toContain("Sign-up successful!");
	});
});
