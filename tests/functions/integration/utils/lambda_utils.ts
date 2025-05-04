import type { APIGatewayProxyEvent } from "aws-lambda";

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
 * const signupEvent = createEmptyLambdaEvent("/signup", "POST", "/signup");
 *
 * @example
 * // Create event with required params and custom properties
 * const loginEvent = createEmptyLambdaEvent(
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
