// src/routes/+layout.ts
import type { LayoutLoad } from './$types.js';

export const load = (async ({ parent }) => {
  const data = await parent();
  
  return {
    ...data
  };
}) satisfies LayoutLoad;