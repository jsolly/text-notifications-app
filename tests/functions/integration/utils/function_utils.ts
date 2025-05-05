import path from "node:path";
import fs from "node:fs";
import { handler as signupHandler } from "../../../../backend/functions/signup-processor/index";
import { handler as apodHandler } from "../../../../backend/functions/apod_photo_fetcher/index";
import type { Context } from "aws-lambda";
import { createAPIGatewayProxyEvent } from "./lambda_utils";

export async function createTestUser() {
	const eventJsonPath = path.resolve(
		__dirname,
		"../../../backend/events/signup-event-All-notifications-enabled.json",
	);
	const eventJson = JSON.parse(fs.readFileSync(eventJsonPath, "utf8"));

	// Create a test user
	await signupHandler(eventJson, {} as Context);
}

export async function createAPODRecord() {
	const apod_event = createAPIGatewayProxyEvent("/apod", "POST", "/apod");
	await apodHandler(apod_event, {} as Context);
}
