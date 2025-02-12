import { describe, expect, it } from "vitest";
import { lambdaHandler } from "../functions/signup-processor/index";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

describe("Signup Processor Lambda", () => {
	it("returns hello world response", async () => {
		const event = {} as APIGatewayProxyEvent;
		const context = {} as Context;

		const result = await lambdaHandler(event, context);

		expect(result).toBeTypeOf("object");
		expect(result.statusCode).toBe(200);
		expect(result.body).toBeTypeOf("string");

		const response = JSON.parse(result.body);
		expect(response).toBeTypeOf("object");
		expect(response.message).toBe("hello world!");
	});
});
