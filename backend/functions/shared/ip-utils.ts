import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Extracts the client IP address from an API Gateway event
 *
 * This function handles multiple sources of IP addresses in order of preference:
 * 1. AWS API Gateway's sourceIp from requestContext.identity
 * 2. X-Forwarded-For header (first IP in the chain)
 *
 * @param event - The API Gateway proxy event
 * @returns The client IP address or undefined if not found
 */
export const getClientIp = (
	event: APIGatewayProxyEvent,
): string | undefined => {
	const sourceIp = event.requestContext.identity?.sourceIp;
	if (sourceIp) {
		return sourceIp;
	}

	const forwarded = event.headers["x-forwarded-for"]?.split(",")[0]?.trim();
	return forwarded || undefined;
};
