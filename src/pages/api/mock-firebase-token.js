function json(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

export async function POST({ request }) {
	let body;

	try {
		body = await request.json();
	} catch {
		return json({ error: "invalid json" }, 400);
	}

	const email = String(body.email || "").trim();
	const bubbleUserId = String(body.bubbleUserId || "").trim();
	const name = String(body.name || "").trim();

	if (!email || !bubbleUserId) {
		return json({ error: "email and bubbleUserId required" }, 400);
	}

	return json({
		token: `mock-token-${Date.now()}`,
		user: {
			uid: bubbleUserId,
			email,
			name,
		},
		note: "This is a protocol-only token. Replace this endpoint with Firebase Admin createCustomToken() for real sign-in.",
	});
}

export function GET() {
	return json({ error: "POST required" }, 405);
}
