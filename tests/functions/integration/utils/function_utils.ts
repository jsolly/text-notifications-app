// import path from "node:path";
// import fs from "node:fs";
// import { handler } from "../../../../backend/functions/signup-processor/index";
// import type { Context } from "aws-lambda";

// export async function createTestUser() {
// 	const eventJsonPath = path.resolve(
// 		__dirname,
// 		"../../../backend/events/signup-event-All-notifications-enabled.json",
// 	);
// 	const eventJson = JSON.parse(fs.readFileSync(eventJsonPath, "utf8"));

// 	// Create a test user
// 	await handler(eventJson, {} as Context);
// }

// export async function createAPODRecord() {
// 	event = {
// 		body: formData.toString(),
// 		isBase64Encoded: false,
// 		requestContext: {
// 			identity: {
// 				sourceIp: "127.0.0.1",
// 				userAgent: "test-agent",
// 			},
// 		},
// 		pathParameters: null,
// 		queryStringParameters: null,
// 		multiValueQueryStringParameters: null,
// 		stageVariables: null,
// 		httpMethod: "POST",
// 		path: "/signup",
// 		resource: "/signup",
// 	} as unknown as APIGatewayProxyEvent;
// }
