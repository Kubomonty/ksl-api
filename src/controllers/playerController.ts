import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import pool from '../config/db.js';

interface PlayerRequestBody {
  name?: string;
  playerOrder?: number;
  teamId?: string;
}

export const createPlayerReq = async (req: Request<{}, {}, PlayerRequestBody>, res: Response): Promise<void> => {
  const { name, playerOrder, teamId } = req.body;
  console.log(`Create new player attempt for ${name} at ${new Date().toISOString()}`);
  if (!name) {
    res.status(400).send('Player name is missing in the data');
    return;
  } else if (!teamId) {
    res.status(400).send('TeamId is missing in the data');
    return;
  } else if (!playerOrder) {
    res.status(400).send('Player order is missing in the data');
    return;
  }

  try {
    const newPlayer = await createPlayer(name, playerOrder, teamId);
    if (!newPlayer) {
      res.status(500).send('Some error has occurred');
      return;
    }
    res.status(201).send({ message: 'New Player created', playerId: newPlayer.id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};

export const createPlayer = async (name: string, playerOrder: number, teamId: string): Promise<{id: string, name: string, player_order: number, team_id: string} | undefined> => {
  const query = `
    INSERT INTO players (id, name, user_id, player_order)
    VALUES ($1, $2, $3, $4)
    RETURNING id;
  `;
  const values = [uuidv4(), name, teamId, playerOrder];

  const result = await pool.query(query, values);
  return result.rows[0];
}