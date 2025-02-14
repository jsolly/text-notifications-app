import { describe, expect, it } from "vitest";
import { lambdaHandler } from "../functions/signup-processor/index";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import testEvent from "../events/test-event.json";

describe("Signup Processor Lambda", () => {
	it("processes signup form submission", async () => {
		const event = testEvent as unknown as APIGatewayProxyEvent;
		const context = {} as Context;

		const result = await lambdaHandler(event, context);

		expect(result).toBeTypeOf("object");
		expect(result.statusCode).toBe(200);
		expect(result.headers).toHaveProperty(
			"Access-Control-Allow-Origin",
			"http://localhost:4321",
		);
		expect(result.body).toBeTypeOf("string");

		const response = JSON.parse(result.body);
		expect(response).toBeTypeOf("object");
		expect(response.message).toBe("Sign-up successful");
		expect(response.data).toMatchObject({
			contactInfo: {
				phoneNumber: "(279) 321-2870",
				cityId: "",
			},
			preferences: {
				preferredLanguage: "en",
				unitPreference: "metric",
				timeFormat: "24h",
				notificationTimezone: "UTC",
			},
			notifications: {
				dailyFullmoon: true,
				dailyNasa: true,
				dailyWeatherOutfit: true,
				dailyRecipe: true,
				instantSunset: true,
				dailyNotificationTime: "morning",
			},
		});
	});
});
