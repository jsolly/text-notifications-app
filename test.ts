await client.execute({
	name: "insert-user",
	text: `
    INSERT INTO users (${Object.keys(FORM_FIELDS).join(", ")})
    VALUES (${Object.values(formData).join(", ")})
  `,
});
