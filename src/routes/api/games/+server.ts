// routes/api/games/+server.ts
import { json } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { tetrisGames, snakeGames } from '$lib/server/db/schema.js';
import type { GameId } from '$lib/types.js';

import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ url }: RequestEvent) {
    const gameId = url.searchParams.get('gameId') as GameId;
    const roundId = url.searchParams.get('roundId');
    
    try {
        const table = gameId === 'tetris' ? tetrisGames : snakeGames;
        const scores = await db.select().from(table)
            .where(roundId ? eq(table.round_id, Number(roundId)) : undefined)
            .orderBy(desc(table.score));
        
        return json(scores);
    } catch (error) {
        return json({ error: 'Failed to fetch scores' }, { status: 500 });
    }
}

export async function POST({ request }: RequestEvent) {
  const { 
    gameState,
    playerAddress, 
    score,
    blockNumber,
    stake,
    scoreHash,
    transactionHash,
    contractHash,
    roundId,
    transactionBlockNumber,
    transactionTimestamp
  } = await request.json();

  try {
    await db.insert(tetrisGames).values({
      player_address: playerAddress,
      score: Number(score),
      block_number: Number(blockNumber),
      stake: Number(stake),
      game_state: JSON.stringify(gameState),
      score_hash: scoreHash,
      transaction_hash: transactionHash,
      contract_hash: contractHash,
      round_id: Number(roundId),
      transaction_block_number: transactionBlockNumber,
      transaction_timestamp: new Date(transactionTimestamp),
      verified: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to save game data' }, { status: 500 });
  }
}