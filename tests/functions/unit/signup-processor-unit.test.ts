import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { handler } from "../../../backend/functions/signup-processor/index.js";
import * as db from "../../../backend/functions/shared/db.js";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import type { PoolClient } from "pg";

// Mock the database module
vi.mock("../../../backend/functions/shared/db", () => {
	return {
		getDbClient: vi.fn(),
		closeDbClient: vi.fn(),
		executeTransaction: vi.fn(),
		generateInsertStatement: vi.fn().mockImplementation((tableName, data) => {
			// Simple mock implementation that returns placeholder SQL and data as params
			return {
				sql: `INSERT INTO ${tableName} MOCK SQL`,
				params: Object.values(data),
			};
		}),
	};
});

// Helper to create a mock event
function createMockEvent(formData: URLSearchParams): APIGatewayProxyEvent {
	return {
		body: formData.toString(),
		isBase64Encoded: false,
		requestContext: {
			identity: {
				sourceIp: "127.0.0.1",
				userAgent: "test-agent",
			},
			requestId: "test-request-id",
		},
		headers: {},
		pathParameters: null,
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		stageVariables: null,
		httpMethod: "POST",
		path: "/signup",
		resource: "/signup",
	} as unknown as APIGatewayProxyEvent;
}

// Helper to create base form data
function createBaseFormData() {
	const formData = new URLSearchParams();
	formData.append("name", "Test User");
	formData.append("phone_country_code", "+1");
	formData.append("phone_number", "(555) 555-5555");
	formData.append("city_id", "126104");
	formData.append("language", "en");
	formData.append("unit", "metric");
	formData.append("time_format", "24h");
	formData.append("notification_time", "morning");
	formData.append("notifications", "celestial_events");
	formData.append("notifications", "astronomy_photo");
	return formData;
}

describe("Signup Processor Lambda [unit]", () => {
	// Mock database client
	const mockClient = {
		query: vi.fn().mockResolvedValue({ rows: [{ user_id: "mock-user-id" }] }),
		release: vi.fn(),
	} as unknown as PoolClient;

	// Mock context
	const mockContext = {} as Context;

	// Disable console output during tests
	const originalConsoleError = console.error;
	const originalConsoleLog = console.log;

	beforeEach(() => {
		console.error = vi.fn();
		console.log = vi.fn();

		// Setup environment
		process.env.NODE_ENV = "test";

		// Reset mocks
		vi.clearAllMocks();

		// Setup database client mock
		vi.mocked(db.getDbClient).mockResolvedValue(mockClient);
		vi.mocked(db.executeTransaction).mockImplementation(
			async (_client: PoolClient, callback: () => Promise<unknown>) => {
				return await callback();
			},
		);
	});

	afterEach(() => {
		// Restore console functions
		console.error = originalConsoleError;
		console.log = originalConsoleLog;

		// Clear environment variables
		process.env.NODE_ENV = undefined;
	});

	it("successfully processes valid form submission [unit]", async () => {
		// Create mock event with form data
		const formData = createBaseFormData();
		const event = createMockEvent(formData);

		// Execute handler
		const result = await handler(event, mockContext);

		// Verify success response
		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
			"HX-Trigger": "signupResponse",
		});
		expect(result.body).toContain('id="submit_button"');
		expect(result.body).toContain('data-success="true"');
		expect(result.body).toContain("Sign Up Successful!");

		// Verify database interactions
		expect(db.getDbClient).toHaveBeenCalledTimes(1);
		expect(db.executeTransaction).toHaveBeenCalledTimes(1);
		expect(db.closeDbClient).toHaveBeenCalledWith(mockClient);
	});

	it("handles duplicate phone number error [unit]", async () => {
		// Create mock event with form data
		const formData = createBaseFormData();
		const event = createMockEvent(formData);

		// Mock database error for duplicate phone number
		vi.mocked(db.executeTransaction).mockRejectedValueOnce(
			new Error("unique constraint violation phone_number"),
		);

		// Execute handler
		const result = await handler(event, mockContext);

		// Verify error response
		expect(result.statusCode).toBe(400);
		expect(result.body).toContain('data-error="true"');
		expect(result.body).toContain(
			"A user with that phone number already exists",
		);

		// Verify database connection was properly closed
		expect(db.closeDbClient).toHaveBeenCalledWith(mockClient);
	});

	it("processes base64 encoded form data [unit]", async () => {
		// Create base64 encoded form data
		const formData = createBaseFormData();
		const base64Body = Buffer.from(formData.toString()).toString("base64");

		const event = {
			...createMockEvent(new URLSearchParams()),
			body: base64Body,
			isBase64Encoded: true,
		} as unknown as APIGatewayProxyEvent;

		// Execute handler
		const result = await handler(event, mockContext);

		// Verify success response
		expect(result.statusCode).toBe(200);
		expect(result.body).toContain('data-success="true"');

		// Verify database was accessed
		expect(db.getDbClient).toHaveBeenCalledTimes(1);
	});
});
