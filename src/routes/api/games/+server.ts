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
    const table: typeof tetrisGames | typeof snakeGames = gameId === 'tetris' ? tetrisGames : snakeGames;
    let query: any = db.select().from(table);
    
    if (roundId) {
      query = query.where(eq(table.round_id, Number(roundId)));
    }
    
    const scores = await query;
    return json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    return json([]);
  }
}

export async function POST({ request }: RequestEvent) {
  try {
    const { 
      gameId,
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

    // Sélectionner la table appropriée en fonction du gameId
    const table = gameId === 'tetris' ? tetrisGames : snakeGames;
    
    try {
      await db.insert(table).values({
        player_address: playerAddress,
        score: Number(score),
        block_number: Number(blockNumber),
        stake: Number(stake),
        game_state: typeof gameState === 'string' ? gameState : JSON.stringify(gameState),
        score_hash: scoreHash,
        transaction_hash: transactionHash,
        contract_hash: contractHash,
        round_id: Number(roundId),
        transaction_block_number: transactionBlockNumber ? Number(transactionBlockNumber) : null,
        transaction_timestamp: transactionTimestamp ? new Date(transactionTimestamp) : new Date(),
        verified: false,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      return json({ success: true });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Simulation d'une réponse réussie pour le développement
      if (process.env.NODE_ENV !== 'production') {
        console.log('Development mode: simulating successful score submission');
        return json({ success: true, simulated: true });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Error saving game data:', error);
    return json({ error: 'Failed to save game data' }, { status: 500 });
  }
}