// src/routes/admin/+page.server.ts
import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';

export const load = (async ({ locals }) => {
  return {
    // Ces données seront peuplées par les états côté client
    isAdmin: false,
    isVerifier: false
  };
}) satisfies PageServerLoad;