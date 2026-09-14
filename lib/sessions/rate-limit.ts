// lib/sessions/rate-limit.ts
// Per-user daily message cap for app/api/sessions/[sessionId]/message/route.ts.
//
// Display text ONLY — the real enforcement is a hardcoded literal inside the
// increment_message_rate_limit SQL function
// (supabase/migrations/20260913000000_message_rate_limits.sql), not this
// constant. That function deliberately takes no p_cap argument (a
// caller-supplied cap on a SECURITY DEFINER RPC would let a direct call
// override it), so this value can't be threaded through to enforcement —
// changing the cap means updating both this constant AND that migration's
// literal by hand, in a new migration.
export const MESSAGE_DAILY_LIMIT = 75;
