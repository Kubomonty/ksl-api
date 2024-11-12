import { CreateMatchRequestBody, Match, MatchDetailsDto } from '../models/index.js';
import { Request, Response } from 'express';
import { MatchStatus } from '../enums/MatchStatus.enum.js';
import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import { stat } from 'fs';

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
    SELECT *
    FROM matches
    ORDER BY match_date DESC
    LIMIT $1 OFFSET $2;
  `;
  const values = [limit, offset];

  const result = await pool.query(query, values);
  return result.rows;
};

export const getMatchDetailsReq = async (req: Request, res: Response): Promise<void> => {
  const matchId = req.params.matchId;
  console.log(`Get match details for match ${matchId} at ${new Date().toISOString()}`);

  try {
    const matchDetails: MatchDetailsDto = await getMatchDetails(matchId);
    res.status(200).send(matchDetails);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const getMatchDetails = async (matchId: string): Promise<MatchDetailsDto> => {
  const query = `
    SELECT
      m.id, m.guest_team, m.guest_captain, m.home_team, m.home_captain, m.match_location, m.match_date, m.created_at, m.status,
      q1.guest_pos1 AS guest_pos1_q1, q1.guest_pos2 AS guest_pos2_q1, q1.guest_pos3 AS guest_pos3_q1, q1.guest_pos4 AS guest_pos4_q1,
      q1.guest_pos5 AS guest_pos5_q1, q1.guest_pos6 AS guest_pos6_q1, q1.guest_pos7 AS guest_pos7_q1, q1.guest_pos8 AS guest_pos8_q1,
      q1.home_pos1 AS home_pos1_q1, q1.home_pos2 AS home_pos2_q1, q1.home_pos3 AS home_pos3_q1, q1.home_pos4 AS home_pos4_q1,
      q1.home_pos5 AS home_pos5_q1, q1.home_pos6 AS home_pos6_q1, q1.home_pos7 AS home_pos7_q1, q1.home_pos8 AS home_pos8_q1,
      q1.guest_legs AS guest_legs_q1, q1.home_legs AS home_legs_q1, q1.guest_score AS guest_score_q1, q1.home_score AS home_score_q1,
      q2.guest_pos1 AS guest_pos1_q2, q2.guest_pos2 AS guest_pos2_q2, q2.guest_pos3 AS guest_pos3_q2, q2.guest_pos4 AS guest_pos4_q2,
      q2.guest_pos5 AS guest_pos5_q2, q2.guest_pos6 AS guest_pos6_q2, q2.guest_pos7 AS guest_pos7_q2, q2.guest_pos8 AS guest_pos8_q2,
      q2.home_pos1 AS home_pos1_q2, q2.home_pos2 AS home_pos2_q2, q2.home_pos3 AS home_pos3_q2, q2.home_pos4 AS home_pos4_q2,
      q2.home_pos5 AS home_pos5_q2, q2.home_pos6 AS home_pos6_q2, q2.home_pos7 AS home_pos7_q2, q2.home_pos8 AS home_pos8_q2,
      q2.guest_legs AS guest_legs_q2, q2.home_legs AS home_legs_q2, q2.guest_score AS guest_score_q2, q2.home_score AS home_score_q2,
      q3.guest_pos1 AS guest_pos1_q3, q3.guest_pos2 AS guest_pos2_q3, q3.guest_pos3 AS guest_pos3_q3, q3.guest_pos4 AS guest_pos4_q3,
      q3.guest_pos5 AS guest_pos5_q3, q3.guest_pos6 AS guest_pos6_q3, q3.guest_pos7 AS guest_pos7_q3, q3.guest_pos8 AS guest_pos8_q3,
      q3.home_pos1 AS home_pos1_q3, q3.home_pos2 AS home_pos2_q3, q3.home_pos3 AS home_pos3_q3, q3.home_pos4 AS home_pos4_q3,
      q3.home_pos5 AS home_pos5_q3, q3.home_pos6 AS home_pos6_q3, q3.home_pos7 AS home_pos7_q3, q3.home_pos8 AS home_pos8_q3,
      q3.guest_legs AS guest_legs_q3, q3.home_legs AS home_legs_q3, q3.guest_score AS guest_score_q3, q3.home_score AS home_score_q3,
      q4.guest_pos1 AS guest_pos1_q4, q4.guest_pos2 AS guest_pos2_q4, q4.guest_pos3 AS guest_pos3_q4, q4.guest_pos4 AS guest_pos4_q4,
      q4.guest_pos5 AS guest_pos5_q4, q4.guest_pos6 AS guest_pos6_q4, q4.guest_pos7 AS guest_pos7_q4, q4.guest_pos8 AS guest_pos8_q4,
      q4.home_pos1 AS home_pos1_q4, q4.home_pos2 AS home_pos2_q4, q4.home_pos3 AS home_pos3_q4, q4.home_pos4 AS home_pos4_q4,
      q4.home_pos5 AS home_pos5_q4, q4.home_pos6 AS home_pos6_q4, q4.home_pos7 AS home_pos7_q4, q4.home_pos8 AS home_pos8_q4,
      q4.guest_legs AS guest_legs_q4, q4.home_legs AS home_legs_q4, q4.guest_score AS guest_score_q4, q4.home_score AS home_score_q4
    FROM matches AS m
    JOIN match_details AS q1
      ON m.id = q1.match_id
      AND q1.quarter = 1
    JOIN match_details AS q2
      ON m.id = q2.match_id
      AND q2.quarter = 2
    JOIN match_details AS q3
      ON m.id = q3.match_id
      AND q3.quarter = 3
    JOIN match_details AS q4
      ON m.id = q4.match_id
      AND q4.quarter = 4
    WHERE id = $1;
  `;
  const values = [matchId];

  const resultRows = await pool.query(query, values);
  const result = {
    id: resultRows.rows[0].id,
    guestTeam: resultRows.rows[0].guest_team,
    guestCaptain: resultRows.rows[0].guest_captain,
    homeTeam: resultRows.rows[0].home_team,
    homeCaptain: resultRows.rows[0].home_captain,
    matchLocation: resultRows.rows[0].match_location,
    matchDate: resultRows.rows[0].match_date,
    createdAt: resultRows.rows[0].created_at,
    status: resultRows.rows[0].status,
    quarters: {
      q1: {
        guest: {
          pos1: resultRows.rows[0].guest_pos1_q1,
          pos2: resultRows.rows[0].guest_pos2_q1,
          pos3: resultRows.rows[0].guest_pos3_q1,
          pos4: resultRows.rows[0].guest_pos4_q1,
          pos5: resultRows.rows[0].guest_pos5_q1,
          pos6: resultRows.rows[0].guest_pos6_q1,
          pos7: resultRows.rows[0].guest_pos7_q1,
          pos8: resultRows.rows[0].guest_pos8_q1,
          legs: resultRows.rows[0].guest_legs_q1,
          score: resultRows.rows[0].guest_score_q1
        },
        home: {
          pos1: resultRows.rows[0].home_pos1_q1,
          pos2: resultRows.rows[0].home_pos2_q1,
          pos3: resultRows.rows[0].home_pos3_q1,
          pos4: resultRows.rows[0].home_pos4_q1,
          pos5: resultRows.rows[0].home_pos5_q1,
          pos6: resultRows.rows[0].home_pos6_q1,
          pos7: resultRows.rows[0].home_pos7_q1,
          pos8: resultRows.rows[0].home_pos8_q1,
          legs: resultRows.rows[0].home_legs_q1,
          score: resultRows.rows[0].home_score_q1
        }
      },
      q2: {
        guest: {
          pos1: resultRows.rows[0].guest_pos1_q2,
          pos2: resultRows.rows[0].guest_pos2_q2,
          pos3: resultRows.rows[0].guest_pos3_q2,
          pos4: resultRows.rows[0].guest_pos4_q2,
          pos5: resultRows.rows[0].guest_pos5_q2,
          pos6: resultRows.rows[0].guest_pos6_q2,
          pos7: resultRows.rows[0].guest_pos7_q2,
          pos8: resultRows.rows[0].guest_pos8_q2,
          legs: resultRows.rows[0].guest_legs_q2,
          score: resultRows.rows[0].guest_score_q2
        },
        home: {
          pos1: resultRows.rows[0].home_pos1_q2,
          pos2: resultRows.rows[0].home_pos2_q2,
          pos3: resultRows.rows[0].home_pos3_q2,
          pos4: resultRows.rows[0].home_pos4_q2,
          pos5: resultRows.rows[0].home_pos5_q2,
          pos6: resultRows.rows[0].home_pos6_q2,
          pos7: resultRows.rows[0].home_pos7_q2,
          pos8: resultRows.rows[0].home_pos8_q2,
          legs: resultRows.rows[0].home_legs_q2,
          score: resultRows.rows[0].home_score_q2
        }
      },
      q3: {
        guest: {
          pos1: resultRows.rows[0].guest_pos1_q3,
          pos2: resultRows.rows[0].guest_pos2_q3,
          pos3: resultRows.rows[0].guest_pos3_q3,
          pos4: resultRows.rows[0].guest_pos4_q3,
          pos5: resultRows.rows[0].guest_pos5_q3,
          pos6: resultRows.rows[0].guest_pos6_q3,
          pos7: resultRows.rows[0].guest_pos7_q3,
          pos8: resultRows.rows[0].guest_pos8_q3,
          legs: resultRows.rows[0].guest_legs_q3,
          score: resultRows.rows[0].guest_score_q3
        },
        home: {
          pos1: resultRows.rows[0].home_pos1_q3,
          pos2: resultRows.rows[0].home_pos2_q3,
          pos3: resultRows.rows[0].home_pos3_q3,
          pos4: resultRows.rows[0].home_pos4_q3,
          pos5: resultRows.rows[0].home_pos5_q3,
          pos6: resultRows.rows[0].home_pos6_q3,
          pos7: resultRows.rows[0].home_pos7_q3,
          pos8: resultRows.rows[0].home_pos8_q3,
          legs: resultRows.rows[0].home_legs_q3,
          score: resultRows.rows[0].home_score_q3
        }
      },
      q4: {
        guest: {
          pos1: resultRows.rows[0].guest_pos1_q4,
          pos2: resultRows.rows[0].guest_pos2_q4,
          pos3: resultRows.rows[0].guest_pos3_q4,
          pos4: resultRows.rows[0].guest_pos4_q4,
          pos5: resultRows.rows[0].guest_pos5_q4,
          pos6: resultRows.rows[0].guest_pos6_q4,
          pos7: resultRows.rows[0].guest_pos7_q4,
          pos8: resultRows.rows[0].guest_pos8_q4,
          legs: resultRows.rows[0].guest_legs_q4,
          score: resultRows.rows[0].guest_score_q4
        },
        home: {
          pos1: resultRows.rows[0].home_pos1_q4,
          pos2: resultRows.rows[0].home_pos2_q4,
          pos3: resultRows.rows[0].home_pos3_q4,
          pos4: resultRows.rows[0].home_pos4_q4,
          pos5: resultRows.rows[0].home_pos5_q4,
          pos6: resultRows.rows[0].home_pos6_q4,
          pos7: resultRows.rows[0].home_pos7_q4,
          pos8: resultRows.rows[0].home_pos8_q4,
          legs: resultRows.rows[0].home_legs_q4,
          score: resultRows.rows[0].home_score_q4
        }
      }
    }
  };
  return result;
};
