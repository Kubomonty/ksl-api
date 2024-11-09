import { CreateMatchRequestBody, Match } from '../modules/index.js';
import { Request, Response } from 'express';
import { MatchStatus } from '../enums/MatchStatus.enum.js';
import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export const createMatchReq = async (req: Request<{}, {}, CreateMatchRequestBody>, res: Response): Promise<void> => {
  const {
    createdAt, createdBy,
    guestTeam, guestCaptain, guestPos1, guestPos2, guestPos3,
    guestPos4, guestPos5, guestPos6, guestPos7, guestPos8,
    homeTeam, homeCaptain, homePos1, homePos2, homePos3,
    homePos4, homePos5, homePos6, homePos7, homePos8,
    matchLocation, matchDate
  } = req.body;
  console.log(`Create new match attempt for ${homeTeam} vs. ${guestTeam} at ${new Date().toISOString()}`);
  if (
    !createdAt ||
    !createdBy ||
    !guestTeam ||
    !guestCaptain ||
    !guestPos1 ||
    !guestPos2 ||
    !guestPos3 ||
    !homeTeam ||
    !homeCaptain ||
    !homePos1 ||
    !homePos2 ||
    !homePos3 ||
    !matchLocation ||
    !matchDate
  ) {
    res.status(400).send('Match data is missing in the request');
    return;
  }

  try {
    const newMatch = await createMatch({ createdAt, createdBy, guestTeam, guestCaptain, guestPos1, guestPos2, guestPos3,
      guestPos4, guestPos5, guestPos6, guestPos7, guestPos8, homeTeam, homeCaptain, homePos1, homePos2, homePos3, homePos4,
      homePos5, homePos6, homePos7, homePos8, matchLocation, matchDate });
    res.status(201).send({ message: 'New match created', matchId: newMatch.id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const createMatch = async ({ createdAt, createdBy, guestTeam, guestCaptain, guestPos1, guestPos2, guestPos3,
  guestPos4, guestPos5, guestPos6, guestPos7, guestPos8, homeTeam, homeCaptain, homePos1, homePos2, homePos3, homePos4,
  homePos5, homePos6, homePos7, homePos8, matchLocation, matchDate }: CreateMatchRequestBody): Promise<Match> => {
  const query = `
    INSERT INTO matches (id, created_at, created_by, guest_team, guest_captain, guest_pos1, guest_pos2, guest_pos3,
      guest_pos4, guest_pos5, guest_pos6, guest_pos7, guest_pos8, home_team, home_captain, home_pos1, home_pos2, home_pos3, home_pos4,
      home_pos5, home_pos6, home_pos7, home_pos8, match_location, match_date, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
    RETURNING id;
  `;
  const values = [
    uuidv4(), createdAt, createdBy, guestTeam, guestCaptain, guestPos1, guestPos2, guestPos3,
    guestPos4, guestPos5, guestPos6, guestPos7, guestPos8, homeTeam, homeCaptain, homePos1, homePos2, homePos3, homePos4,
    homePos5, homePos6, homePos7, homePos8, matchLocation, matchDate, MatchStatus.NEW
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getMatchesPageReq = async (req: Request, res: Response): Promise<void> => {
  const page: number = parseInt(req.query.page as string, 10) || 1;
  const limit: number = parseInt(req.query.limit as string, 10) || 10;
  const offset = (page - 1) * limit;
  console.log(`Get matches page ${page} with limit ${limit} at ${new Date().toISOString()}`);

  try {
    const matches: Match[] = await getMatchesPage({ limit, offset });
    res.status(200).send(matches);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const getMatchesPage = async ({ limit, offset }: { limit: number, offset: number }): Promise<Match[]> => {
  const query = `
    SELECT * FROM matches
    ORDER BY match_date DESC
    LIMIT $1 OFFSET $2;
  `;
  const values = [limit, offset];

  const result = await pool.query(query, values);
  return result.rows;
};
