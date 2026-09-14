// lib/sessions/rate-limit.ts
// Per-user daily message cap for app/api/sessions/[sessionId]/message/route.ts.
// Enforced via the increment_message_rate_limit RPC
// (supabase/migrations/20260913000000_message_rate_limits.sql).
export const MESSAGE_DAILY_LIMIT = 75;
