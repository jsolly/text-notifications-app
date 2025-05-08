import type { APIGatewayProxyEvent, EventBridgeEvent } from "aws-lambda";

/**
 * Creates a Lambda event with required routing parameters and optional overrides.
 *
 * @param path - The API path for the event
 * @param httpMethod - The HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param resource - The API resource path
 * @param overrides - Optional object containing additional properties to override the defaults
 * @returns An APIGatewayProxyEvent object
 *
 * @example
 * // Create event with required params
 * const signupEvent = createAPIGatewayProxyEvent("/signup", "POST", "/signup");
 *
 * @example
 * // Create event with required params and custom properties
 * const loginEvent = createAPIGatewayProxyEvent(
 *   "/login",
 *   "POST",
 *   "/login",
 *   {
 *     body: JSON.stringify({ email: "user@example.com", password: "password123" })
 *   }
 * );
 */
export function createAPIGatewayProxyEvent(
	path: string,
	httpMethod: string,
	resource: string,
	overrides: Partial<APIGatewayProxyEvent> = {},
) {
	return {
		body: "",
		isBase64Encoded: false,
		requestContext: {
			identity: {
				sourceIp: "127.0.0.1",
				userAgent: "test-agent",
			},
		},
		pathParameters: null,
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		stageVariables: null,
		httpMethod,
		path,
		resource,
		...overrides,
	} as unknown as APIGatewayProxyEvent;
}

/**
 * Creates an EventBridge/CloudWatch scheduled event for testing Lambda functions.
 *
 * @param overrides - Optional object containing additional properties to override the defaults
 * @returns An EventBridge/CloudWatch event object
 *
 * @example
 * // Create default scheduled event
 * const scheduledEvent = createScheduledEvent();
 *
 * @example
 * // Create scheduled event with custom properties
 * const customEvent = createScheduledEvent({
 *   time: "2023-10-15T15:30:00Z",
 *   resources: ["arn:aws:events:us-east-1:123456789012:rule/CustomRule"],
 *   detail: { customProperty: "value" }
 * });
 */
export function createEventBridgeEvent(
	overrides: Partial<
		EventBridgeEvent<"Scheduled Event", Record<string, unknown>>
	> = {},
) {
	return {
		version: "0",
		id: "7ecf3a42-8deb-455b-b39e-f27dae983f25",
		"detail-type": "Scheduled Event",
		source: "aws.events",
		account: "123456789012",
		time: new Date().toISOString(),
		region: "us-east-1",
		resources: ["arn:aws:events:us-east-1:123456789012:rule/DefaultRule"],
		detail: {},
		...overrides,
	} as EventBridgeEvent<"Scheduled Event", Record<string, unknown>>;
}
