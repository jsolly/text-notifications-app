/**
 * Test environment configuration for Twilio integration tests
 *
 * When USE_TWILIO_TEST_CREDENTIALS is true:
 * - Uses Twilio test credentials (no actual SMS sent)
 * - FROM number must be +15005550006
 * - TO numbers: any valid number for success, +15005550009 for failure
 *
 * When USE_TWILIO_TEST_CREDENTIALS is false:
 * - Uses real Twilio credentials (actual SMS sent)
 * - FROM number must be your real Twilio phone number
 * - TO numbers must be real, SMS-capable phone numbers
 */

export interface TwilioTestConfig {
	accountSid: string;
	authToken: string;
	senderPhoneNumber: string;
	useTestCredentials: boolean;
}

export function getTwilioTestConfig(): TwilioTestConfig {
	const useTestCredentials = process.env.USE_TWILIO_TEST_CREDENTIALS === "true";

	if (useTestCredentials) {
		// Ensure test credentials are set
		if (
			!process.env.TWILIO_TEST_ACCOUNT_SID ||
			!process.env.TWILIO_TEST_AUTH_TOKEN
		) {
			throw new Error(
				"TWILIO_TEST_ACCOUNT_SID and TWILIO_TEST_AUTH_TOKEN must be set when USE_TWILIO_TEST_CREDENTIALS=true",
			);
		}

		return {
			accountSid: process.env.TWILIO_TEST_ACCOUNT_SID,
			authToken: process.env.TWILIO_TEST_AUTH_TOKEN,
			senderPhoneNumber: "+15005550006", // Magic FROM number for test credentials
			useTestCredentials: true,
		};
	}

	// Use real credentials
	if (
		!process.env.TWILIO_ACCOUNT_SID ||
		!process.env.TWILIO_AUTH_TOKEN ||
		!process.env.TWILIO_SENDER_PHONE_NUMBER
	) {
		throw new Error(
			"TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SENDER_PHONE_NUMBER must be set for real SMS testing",
		);
	}

	return {
		accountSid: process.env.TWILIO_ACCOUNT_SID,
		authToken: process.env.TWILIO_AUTH_TOKEN,
		senderPhoneNumber: process.env.TWILIO_SENDER_PHONE_NUMBER,
		useTestCredentials: false,
	};
}

/**
 * Sets up environment variables for Twilio based on test configuration
 */
export function setupTwilioTestEnv(): void {
	const config = getTwilioTestConfig();

	// Override the environment variables that the Lambda function will use
	process.env.TWILIO_ACCOUNT_SID = config.accountSid;
	process.env.TWILIO_AUTH_TOKEN = config.authToken;
	process.env.TWILIO_SENDER_PHONE_NUMBER = config.senderPhoneNumber;
}