import { auth } from "./shared.js";

const DEMO_QUERY_PARAM = "bubble_sso_demo";
const MOCK_TOKEN_PREFIX = "mock-token-";

let bridgeInitialized = false;
let tokenWatchStarted = false;

function isDemoMode() {
	return new URLSearchParams(window.location.search).get(DEMO_QUERY_PARAM) === "1";
}

function isEmbedded() {
	return window.parent && window.parent !== window;
}

function getConfiguredOrigins() {
	return (import.meta.env.PUBLIC_BUBBLE_ALLOWED_ORIGINS || "")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
}

function getAllowedOrigins() {
	const origins = new Set(getConfiguredOrigins());
	if (isDemoMode()) origins.add(window.location.origin);
	return origins;
}

function getParentOrigin() {
	const configured = import.meta.env.PUBLIC_BUBBLE_PARENT_ORIGIN || "";
	if (configured) return configured;
	if (isDemoMode()) return window.location.origin;
	try {
		return document.referrer ? new URL(document.referrer).origin : "";
	} catch {
		return "";
	}
}

function isAllowedOrigin(origin) {
	return getAllowedOrigins().has(origin);
}

function postToBubble(message) {
	if (!isEmbedded()) return;
	const targetOrigin = getParentOrigin();
	if (!targetOrigin) return;
	window.parent.postMessage(message, targetOrigin);
}

function showSsoBanner(message, type = "info") {
	let banner = document.getElementById("bubbleSsoDemoBanner");
	if (!banner) {
		banner = document.createElement("div");
		banner.id = "bubbleSsoDemoBanner";
		banner.style.cssText = [
			"position:fixed",
			"left:16px",
			"bottom:16px",
			"z-index:99999",
			"max-width:420px",
			"padding:12px 14px",
			"border-radius:10px",
			"font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
			"box-shadow:0 12px 30px rgba(0,0,0,.18)",
			"border:1px solid rgba(255,255,255,.22)",
		].join(";");
		document.body.appendChild(banner);
	}

	const palette = {
		info: ["#172033", "#c9d7ff"],
		success: ["#14351f", "#c8ffd4"],
		warning: ["#3a2b12", "#ffe6af"],
		error: ["#3b1515", "#ffd2d2"],
	};
	const [background, color] = palette[type] || palette.info;
	banner.style.background = background;
	banner.style.color = color;
	banner.textContent = message;
}

async function signInWithIncomingToken(token) {
	if (isDemoMode() && token.startsWith(MOCK_TOKEN_PREFIX)) {
		showSsoBanner("Demo token accepted by iframe. This proves Bubble -> iframe postMessage works. Use a real Firebase custom token to test actual Firebase sign-in.", "success");
		postToBubble({ type: "SSO_DEMO_RESULT", status: "MockTokenAccepted" });
		return;
	}

	if (!auth) {
		setTimeout(() => signInWithIncomingToken(token), 250);
		return;
	}

	try {
		await auth.signInWithCustomToken(token);
		showSsoBanner("Firebase custom token accepted. Iframe is signed in.", "success");
		postToBubble({ type: "FIREBASE_SIGN_IN_RESULT", status: "Success" });
	} catch (err) {
		showSsoBanner(`Firebase token rejected: ${err.message || String(err)}`, "error");
		postToBubble({
			type: "FIREBASE_SIGN_IN_RESULT",
			status: "Error",
			message: err.message || String(err),
		});
	}
}

export function notifyBubbleAuthStatus(status, reason = "auth_state_changed") {
	postToBubble({ type: "AUTH_STATUS", status, reason });
}

export function requestBubbleTokenRefresh(reason = "token_refresh_required") {
	showSsoBanner(`Requesting a fresh token from Bubble. Reason: ${reason}`, "warning");
	postToBubble({ type: "TOKEN_REFRESH_REQUIRED", reason });
}

export function startBubbleSsoTokenWatch() {
	if (tokenWatchStarted || !auth) return;
	tokenWatchStarted = true;

	auth.onIdTokenChanged(async (user) => {
		if (!user) return;
		try {
			await user.getIdToken();
		} catch (err) {
			requestBubbleTokenRefresh(err.code || "id_token_refresh_failed");
		}
	});
}

export function initBubbleSsoBridge() {
	if (bridgeInitialized) return;
	bridgeInitialized = true;

	window.addEventListener("message", (event) => {
		if (!isAllowedOrigin(event.origin)) return;

		const data = event.data || {};
		if (data.type === "FIREBASE_TOKEN" && typeof data.token === "string") {
			signInWithIncomingToken(data.token);
			return;
		}

		if (data.type === "SIMULATE_TOKEN_EXPIRED") {
			requestBubbleTokenRefresh("demo_forced_expiration");
			return;
		}

		if (data.type === "BUBBLE_SESSION_EXPIRED") {
			showSsoBanner("Bubble session expired. User should log in through Bubble again.", "error");
		}
	});

	if (isDemoMode()) {
		showSsoBanner("Bubble SSO demo mode enabled. Waiting for mock parent messages.", "info");
	}
}

window.requestBubbleTokenRefresh = requestBubbleTokenRefresh;
window.simulateBubbleTokenExpired = () => requestBubbleTokenRefresh("manual_demo_call");
