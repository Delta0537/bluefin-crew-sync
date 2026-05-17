// Nitro server route — handled at the HTTP layer, bypasses TanStack SSR entirely.
// Returns 200 "ok" as long as the Node process is alive.
export default defineEventHandler(() => "ok");
