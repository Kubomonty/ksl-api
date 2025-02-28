import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import pool from '../config/db.js';

interface SeasonDto {
  createdAt: Date;
  createdBy: string;
  id: string;
  isActive: boolean;
  name: string;
}

export const createSeasonReq = async (req: Request, res: Response): Promise<void> => {
  const { name, createdBy } = req.body;
  console.log(`Create new season ${name} at ${new Date().toISOString()}`);
  if (!name || !createdBy) {
    res.status(400).send('Season data is missing in the request');
    return;
  }

  try {
    const newSeason = await createSeason({ name, createdBy });
    res.status(201).send({ message: 'New season created', seasonId: newSeason.id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const createSeason = async ({ name, createdBy }: { name: string, createdBy: string }) => {
  const query = `INSERT INTO seasons (id, name, created_at, created_by, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `;
  const values = [uuidv4(), name, new Date(), createdBy, false];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getSeasonsReq = async (req: Request, res: Response): Promise<void> => {
  console.log(`Get all seasons at ${new Date().toISOString()}`);
  try {
    const seasons = await getSeasons();
    res.status(200).send(seasons);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const getSeasons = async () => {
  const query = `SELECT * FROM seasons ORDER BY created_at DESC`;
  const result = await pool.query(query);
  const seasonsMap = new Map<string, SeasonDto>();

  result.rows.forEach(row => {
    if (!seasonsMap.has(row.id)) {
      seasonsMap.set(row.id, {
        createdAt: row.created_at,
        createdBy: row.created_by,
        id: row.id,
        isActive: row.is_active,
        name: row.name
      });
    }
  });
  return Array.from(seasonsMap.values());
};
export const getActiveSeasonId = async () => {
  const query = `SELECT id FROM seasons WHERE is_active = true`;
  const result = await pool.query(query);
  return result.rows[0].id;
};

export const setActiveSeasonReq = async (req: Request, res: Response): Promise<void> => {
  const { id: seasonId } = req.body;
  console.log(`Set active season ${seasonId} at ${new Date().toISOString()}`);
  if (!seasonId) {
    res.status(400).send('SeasonId is missing in the request');
    return;
  }

  try {
    await setActiveSeason(seasonId);
    res.status(200).send({ message: 'Active season updated' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const setActiveSeason = async (seasonId: string) => {
  const query = `UPDATE seasons SET is_active = false`;
  await pool.query(query);
  const query2 = `UPDATE seasons SET is_active = true WHERE id = $1`;
  const values = [seasonId];
  await pool.query(query2, values);
};