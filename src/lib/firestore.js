import { renderHistoryChart, renderHistoryList } from "./history.js";
import { auth, db } from "./shared.js";
import {
	conversationId,
	scoreHistory,
	sessionStartTime,
	setScoreHistory,
} from "./state.js";

export async function logAuditEvent(type, source, message, details) {
	try {
		if (!db) return;
		const entry = {
			type: type,
			source: source,
			message: message,
			details: details || "",
			userEmail: auth && auth.currentUser ? auth.currentUser.email : "unknown",
			userId: auth && auth.currentUser ? auth.currentUser.uid : "unknown",
			conversationId: conversationId || null,
			sessionStartTime: sessionStartTime
				? new Date(sessionStartTime).toISOString()
				: null,
			timestamp: firebase.firestore.FieldValue.serverTimestamp(),
			userAgent: navigator.userAgent,
		};
		await db.collection("audit_logs").add(entry);
	} catch (e) {
		console.warn("Could not write audit log:", e.message);
	}
}

export async function saveScorecard(data) {
	if (!db || !auth || !auth.currentUser) return;
	try {
		const scorecardData = {
			...data,
			createdAt: firebase.firestore.FieldValue.serverTimestamp(),
			conversationId,
			userEmail: auth.currentUser.email,
			userId: auth.currentUser.uid,
		};
		await db
			.collection("users")
			.doc(auth.currentUser.uid)
			.collection("scorecards")
			.add(scorecardData);
		try {
			await db.collection("all_scorecards").add(scorecardData);
		} catch (e) {
			console.warn("Could not save to all_scorecards:", e.message);
		}
		await loadScoreHistory();
	} catch (err) {
		console.error("Error saving scorecard:", err);
	}
}

export async function loadScoreHistory() {
	if (!db || !auth || !auth.currentUser) return;
	try {
		const snap = await db
			.collection("users")
			.doc(auth.currentUser.uid)
			.collection("scorecards")
			.orderBy("createdAt", "desc")
			.limit(50)
			.get();
		const history = [];
		snap.forEach((doc) => {
			const d = doc.data();
			history.push({
				id: doc.id,
				overall_score: d.overall_score,
				overall_grade: d.overall_grade,
				summary: d.summary,
				criteria: d.criteria,
				strengths: d.strengths,
				improvements: d.improvements,
				coaching_tip: d.coaching_tip,
				createdAt: d.createdAt ? d.createdAt.toDate() : new Date(),
			});
		});
		setScoreHistory(history);
		renderHistoryList();
		const activeTab = document.querySelector('[data-tab="history"]');
		if (activeTab && activeTab.classList.contains("active"))
			renderHistoryChart();
	} catch (err) {
		console.error("Error loading history:", err);
	}
}
