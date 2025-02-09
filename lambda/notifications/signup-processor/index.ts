import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	let name = "World";

	// Check if we have a name in the query parameters
	if (event.queryStringParameters?.name) {
		name = event.queryStringParameters.name;
	}

	return Promise.resolve({
		statusCode: 200,
		body: JSON.stringify({
			message: `Hello ${name}`,
		}),
	});
};
