import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";

const event = {};
const context = {};

describe("Tests index", () => {
	it("verifies successful response", async () => {
		const result = await lambdaHandler(event, context);

		expect(result).to.be.an("object");
		expect(result.statusCode).to.equal(200);
		expect(result.body).to.be.an("string");

		const response = JSON.parse(result.body);

		expect(response).to.be.an("object");
		expect(response.message).to.be.equal("hello world");
	});
});
