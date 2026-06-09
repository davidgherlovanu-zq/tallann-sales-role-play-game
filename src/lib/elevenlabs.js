import { getConfig } from "./config.js";
import { logAuditEvent } from "./firestore.js";
import { addTranscriptMessage } from "./scorecard.js";
import {
	conversationId,
	sessionStartTime,
	setConversationId,
	transcript,
} from "./state.js";

export function startTranscriptPolling(widget) {
	const observer = new MutationObserver(() => {
		try {
			const shadow = widget.shadowRoot;
			if (shadow) {
				shadow
					.querySelectorAll('[class*="message"], [class*="transcript"]')
					.forEach((msg) => {
						const text = msg.textContent.trim();
						if (text && !transcript.some((t) => t.text === text)) {
							const isUser =
								msg.className.includes("user") ||
								msg.getAttribute("data-role") === "user";
							addTranscriptMessage(isUser ? "user" : "agent", text);
						}
					});
			}
		} catch (e) {}
	});
	observer.observe(widget, {
		childList: true,
		subtree: true,
		characterData: true,
	});
}

export async function fetchElevenLabsTranscript(convId) {
	const config = getConfig();
	const elevenLabsKey = config ? config.elevenLabsApiKey : "";
	if (!elevenLabsKey) {
		console.warn("No ElevenLabs API key configured — cannot fetch transcript.");
		return;
	}

	const delays = [3000, 5000, 7000, 10000];
	for (let attempt = 0; attempt < delays.length; attempt++) {
		await new Promise((r) => setTimeout(r, delays[attempt]));
		console.log(
			"Fetching transcript attempt " +
				(attempt + 1) +
				" of " +
				delays.length +
				" for conversation:",
			convId,
		);

		const res = await fetch(
			`https://api.elevenlabs.io/v1/convai/conversations/${convId}`,
			{
				headers: { "xi-api-key": elevenLabsKey },
			},
		);

		if (!res.ok) {
			const errText = await res.text();
			console.warn(
				"ElevenLabs API error on attempt " + (attempt + 1) + ":",
				res.status,
				errText,
			);
			logAuditEvent(
				"warning",
				"ElevenLabs",
				"API error fetching transcript (attempt " + (attempt + 1) + ")",
				"ConvID: " +
					convId +
					" | Status: " +
					res.status +
					" | Response: " +
					errText.substring(0, 200),
			);
			continue;
		}

		const data = await res.json();
		if (
			data.transcript &&
			Array.isArray(data.transcript) &&
			data.transcript.length > 0
		) {
			data.transcript.forEach((entry) => {
				const role = entry.role === "user" ? "user" : "agent";
				const text = entry.message || entry.text || "";
				if (text.trim()) {
					addTranscriptMessage(role, text.trim());
				}
			});
			updateTranscriptPanel();
			console.log(
				"Transcript fetched successfully on attempt " +
					(attempt + 1) +
					" — " +
					transcript.length +
					" messages",
			);
			return;
		}
		console.log(
			"Transcript not ready yet on attempt " + (attempt + 1) + ", retrying...",
		);
	}
	console.warn(
		"Transcript still empty after all retry attempts for conversation:",
		convId,
	);
	logAuditEvent(
		"error",
		"ElevenLabs",
		"Transcript empty after all retries",
		"ConvID: " + convId + " | 4 attempts over ~25 seconds",
	);
}

export async function fetchMostRecentTranscript(apiKey, agentId) {
	await new Promise((r) => setTimeout(r, 5000));

	const url = agentId
		? `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}&page_size=5`
		: `https://api.elevenlabs.io/v1/convai/conversations?page_size=5`;

	const res = await fetch(url, { headers: { "xi-api-key": apiKey } });
	if (!res.ok) throw new Error(`ElevenLabs list API error ${res.status}`);

	const data = await res.json();
	const conversations = data.conversations || [];
	if (conversations.length === 0)
		throw new Error("No recent conversations found");

	let bestConv = null;
	if (sessionStartTime && conversations.length > 1) {
		let bestDiff = Infinity;
		for (const conv of conversations) {
			const createdAt = conv.created_at ? conv.created_at * 1000 : null;
			if (!createdAt) continue;
			const diff = Math.abs(createdAt - sessionStartTime);
			if (diff < 5 * 60 * 1000 && diff < bestDiff) {
				bestDiff = diff;
				bestConv = conv;
			}
		}
		if (bestConv) {
			console.log(
				"Matched conversation by closest start time (diff: " +
					Math.round(bestDiff / 1000) +
					"s):",
				bestConv.conversation_id,
			);
		}
	}

	if (!bestConv) {
		bestConv = conversations[0];
		const createdAt = bestConv.created_at
			? new Date(bestConv.created_at * 1000)
			: null;
		if (createdAt && Date.now() - createdAt.getTime() > 5 * 60 * 1000) {
			throw new Error(
				"Most recent conversation is too old — likely not from this session",
			);
		}
	}

	const recentId = bestConv.conversation_id;
	console.log("Using conversation ID:", recentId);
	setConversationId(recentId);
	await fetchElevenLabsTranscript(recentId);
}

export function parseManualTranscript(text) {
	text
		.split("\n")
		.filter((l) => l.trim())
		.forEach((line) => {
			const agentMatch = line.match(
				/^(Agent|Prospect|AI|Bot|Client|Customer)\s*:\s*(.*)/i,
			);
			const userMatch = line.match(
				/^(You|Rep|Sales|Me|User|Caller)\s*:\s*(.*)/i,
			);
			if (agentMatch) addTranscriptMessage("agent", agentMatch[2].trim());
			else if (userMatch) addTranscriptMessage("user", userMatch[2].trim());
			else addTranscriptMessage("user", line.trim());
		});
}
