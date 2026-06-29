'use strict';

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const BASE_OPTIONS = {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
  },
};

/**
 * Admin client — uses the service-role key, BYPASSES RLS.
 * Only for privileged server operations (e.g., atomic PL/pgSQL calls,
 * marking reminders as sent across all dentists).
 */
const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  BASE_OPTIONS,
);

/**
 * Anonymous client — uses the anon key.
 * Used for unauthenticated operations: sign-up, sign-in, token refresh.
 */
const supabaseAnon = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  BASE_OPTIONS,
);

/**
 * Creates a user-scoped Supabase client that RESPECTS RLS.
 * Call once per request inside the auth middleware.
 *
 * @param {string} accessToken  JWT Bearer token from the Authorization header
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
const createAuthClient = (accessToken) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...BASE_OPTIONS,
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

module.exports = { supabaseAdmin, supabaseAnon, createAuthClient };
