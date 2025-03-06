// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    
    if (event.url.pathname === '/speed-blocks') {
        return await resolve({
            ...event,
            url: new URL('/games/tetris', event.url)
        });
    }

    return await resolve(event);
};