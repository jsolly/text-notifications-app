import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import type { Sql } from "postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../../../backend/functions/shared/db.js";
import { handler } from "../../../backend/functions/signup-processor/index.js";

// Interface for our mock DB error
interface MockDatabaseError extends Error {
	code?: string;
	constraint?: string;
}

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
	const mockClient = Object.assign(
		(_strings: TemplateStringsArray, ..._values: any[]) => [{ id: "mock-user-id" }],
		{
			release: vi.fn(),
		}
	) as unknown as Sql;

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
		// Default: simulate successful transaction
		vi.mocked(db.executeTransaction).mockImplementation(
			async (_client: Sql, callback: (tx: Sql) => Promise<unknown>) => {
				const dummyTx = {} as Sql;
				// Simulate the callback returning a userResult with an id
				(dummyTx as any)["query"] = vi.fn().mockResolvedValue([{ id: "mock-user-id" }]);
				return await callback(dummyTx);
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
		expect(result.statusCode).toBe(201);
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
		const mockDbError: MockDatabaseError = new Error(
			"unique constraint violation on users_full_phone_key",
		);
		mockDbError.code = "23505";
		mockDbError.constraint = "users_phone_country_code_phone_number_key";
		// For this test, simulate a rejected transaction
		vi.mocked(db.executeTransaction).mockRejectedValueOnce(mockDbError);

		// Execute handler
		const result = await handler(event, mockContext);

		// Verify error response
		expect(result.statusCode).toBe(409);
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
		expect(result.statusCode).toBe(201);
		expect(result.body).toContain('data-success="true"');

		// Verify database was accessed
		expect(db.getDbClient).toHaveBeenCalledTimes(1);
	});
});
