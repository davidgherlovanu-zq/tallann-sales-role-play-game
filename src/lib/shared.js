// Shared mutable firebase references — avoids circular deps
export let db = null;
export let auth = null;
export let currentUser = null;

export function setDb(val) { db = val; }
export function setAuth(val) { auth = val; }
export function setCurrentUser(user) { currentUser = user; }
