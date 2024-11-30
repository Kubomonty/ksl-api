import { CreateMatchRequestBodyDto, MatchDto, MatchDetailsDto, MatchUpdateDto } from '../models/index.js';
import { Request, Response } from 'express';
import { MatchStatus } from '../enums/MatchStatus.enum.js';
import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export const createMatchReq = async (req: Request<{}, {}, CreateMatchRequestBodyDto>, res: Response): Promise<void> => {
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
  homePos5, homePos6, homePos7, homePos8, matchLocation, matchDate }: CreateMatchRequestBodyDto): Promise<MatchDto> => {
  const matchQuery = `
    INSERT INTO matches (id, created_at, created_by, guest_team, guest_captain, home_team, home_captain, match_location, match_date, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id;
  `;
  const matchValues = [
    uuidv4(), createdAt, createdBy, guestTeam, guestCaptain, homeTeam, homeCaptain, matchLocation, matchDate, MatchStatus.NEW
  ];
  const matchResult = await pool.query(matchQuery, matchValues);
  if (matchResult.rowCount === 0) {
    throw new Error('Match not created');
  }

  const matchDetailsQ1Query = `
    INSERT INTO match_details(id, match_id, quarter,
      guest_pos1, guest_pos2, guest_pos3, guest_pos4, guest_pos5, guest_pos6, guest_pos7, guest_pos8,
      home_pos1, home_pos2, home_pos3, home_pos4, home_pos5, home_pos6, home_pos7, home_pos8)
    VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING id;
  `;
  const matchDetailsQ1Values = [
    uuidv4(), matchResult.rows[0].id, guestPos1, guestPos2, guestPos3, guestPos4, guestPos5, guestPos6, guestPos7, guestPos8,
    homePos1, homePos2, homePos3, homePos4, homePos5, homePos6, homePos7, homePos8
  ];
  const q1Result = await pool.query(matchDetailsQ1Query, matchDetailsQ1Values);
  if (q1Result.rowCount === 0) {
    throw new Error('Match details Q1 not created');
  }

  const matchDetailsQ2Query = `
    INSERT INTO match_details(id, match_id, quarter,
      guest_pos1, guest_pos2, guest_pos3, guest_pos4, guest_pos5, guest_pos6, guest_pos7, guest_pos8,
      home_pos1, home_pos2, home_pos3, home_pos4, home_pos5, home_pos6, home_pos7, home_pos8)
    VALUES ($1, $2, 2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING id;
  `;
  const matchDetailsQ2Values = [
    uuidv4(), matchResult.rows[0].id, guestPos1, guestPos2, guestPos3, guestPos4, guestPos5, guestPos6, guestPos7, guestPos8,
    homePos1, homePos2, homePos3, homePos4, homePos5, homePos6, homePos7, homePos8
  ];
  const q2Result = await pool.query(matchDetailsQ2Query, matchDetailsQ2Values);
  if (q2Result.rowCount === 0) {
    throw new Error('Match details Q2 not created');
  }

  const matchDetailsQ3Query = `
    INSERT INTO match_details(id, match_id, quarter,
      guest_pos1, guest_pos2, guest_pos3, guest_pos4, guest_pos5, guest_pos6, guest_pos7, guest_pos8,
      home_pos1, home_pos2, home_pos3, home_pos4, home_pos5, home_pos6, home_pos7, home_pos8)
    VALUES ($1, $2, 3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING id;
  `;
  const matchDetailsQ3Values = [
    uuidv4(), matchResult.rows[0].id, guestPos1, guestPos2, guestPos3, guestPos4, guestPos5, guestPos6, guestPos7, guestPos8,
    homePos1, homePos2, homePos3, homePos4, homePos5, homePos6, homePos7, homePos8
  ];
  const q3Result = await pool.query(matchDetailsQ3Query, matchDetailsQ3Values);
  if (q3Result.rowCount === 0) {
    throw new Error('Match details Q3 not created');
  }

  const matchDetailsQ4Query = `
    INSERT INTO match_details(id, match_id, quarter,
      guest_pos1, guest_pos2, guest_pos3, guest_pos4, guest_pos5, guest_pos6, guest_pos7, guest_pos8,
      home_pos1, home_pos2, home_pos3, home_pos4, home_pos5, home_pos6, home_pos7, home_pos8)
    VALUES ($1, $2, 4, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING id;
  `;
  const matchDetailsQ4Values = [
    uuidv4(), matchResult.rows[0].id, guestPos1, guestPos2, guestPos3, guestPos4, guestPos5, guestPos6, guestPos7, guestPos8,
    homePos1, homePos2, homePos3, homePos4, homePos5, homePos6, homePos7, homePos8
  ];
  const q4Result = await pool.query(matchDetailsQ4Query, matchDetailsQ4Values);
  if (q4Result.rowCount === 0) {
    throw new Error('Match details Q4 not created');
  }

  return matchResult.rows[0];
};

export const getMatchesPageReq = async (req: Request, res: Response): Promise<void> => {
  const page: number = parseInt(req.query.page as string, 10) || 1;
  const limit: number = parseInt(req.query.limit as string, 10) || 10;
  const offset = (page - 1) * limit;
  console.log(`Get matches page ${page} with limit ${limit} at ${new Date().toISOString()}`);

  try {
    const matches = await getMatchesPage({ limit, offset });
    res.status(200).send(matches);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const getMatchesPage = async ({ limit, offset }: { limit: number, offset: number }) => {
  const query = `
    SELECT *
    FROM matches
    ORDER BY match_date DESC, created_at DESC
    LIMIT $1 OFFSET $2;
  `;
  const values = [limit, offset];

  const result = await pool.query(query, values);
  return result.rows;
};

export const getMatchDetailsReq = async (req: Request, res: Response): Promise<void> => {
  const matchId = req.params.id;
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
      m.id AS id, m.guest_team AS guest_team, m.guest_captain AS guest_captain, m.home_team AS home_team, m.home_captain AS home_captain,
      m.match_location AS match_location, m.match_date AS match_date, m.created_at AS created_at, m.status as status,
      q1.guest_pos1 AS guest_pos1_q1, q1.guest_pos2 AS guest_pos2_q1, q1.guest_pos3 AS guest_pos3_q1, q1.guest_pos4 AS guest_pos4_q1,
      q1.guest_pos5 AS guest_pos5_q1, q1.guest_pos6 AS guest_pos6_q1, q1.guest_pos7 AS guest_pos7_q1, q1.guest_pos8 AS guest_pos8_q1,
      q1.home_pos1 AS home_pos1_q1, q1.home_pos2 AS home_pos2_q1, q1.home_pos3 AS home_pos3_q1, q1.home_pos4 AS home_pos4_q1,
      q1.home_pos5 AS home_pos5_q1, q1.home_pos6 AS home_pos6_q1, q1.home_pos7 AS home_pos7_q1, q1.home_pos8 AS home_pos8_q1,
      q1.guest_legs1 AS guest_legs_q1_1, q1.guest_legs2 AS guest_legs_q1_2, q1.guest_legs3 AS guest_legs_q1_3, q1.guest_legs4 AS guest_legs_q1_4,
      q1.home_legs1 AS home_legs_q1_1, q1.home_legs2 AS home_legs_q1_2, q1.home_legs3 AS home_legs_q1_3, q1.home_legs4 AS home_legs_q1_4,
      q1.guest_score AS guest_score_q1, q1.home_score AS home_score_q1,
      q2.guest_pos1 AS guest_pos1_q2, q2.guest_pos2 AS guest_pos2_q2, q2.guest_pos3 AS guest_pos3_q2, q2.guest_pos4 AS guest_pos4_q2,
      q2.guest_pos5 AS guest_pos5_q2, q2.guest_pos6 AS guest_pos6_q2, q2.guest_pos7 AS guest_pos7_q2, q2.guest_pos8 AS guest_pos8_q2,
      q2.home_pos1 AS home_pos1_q2, q2.home_pos2 AS home_pos2_q2, q2.home_pos3 AS home_pos3_q2, q2.home_pos4 AS home_pos4_q2,
      q2.home_pos5 AS home_pos5_q2, q2.home_pos6 AS home_pos6_q2, q2.home_pos7 AS home_pos7_q2, q2.home_pos8 AS home_pos8_q2,
      q2.guest_legs1 AS guest_legs_q2_1, q2.guest_legs2 AS guest_legs_q2_2, q2.guest_legs3 AS guest_legs_q2_3, q2.guest_legs4 AS guest_legs_q2_4,
      q2.home_legs1 AS home_legs_q2_1, q2.home_legs2 AS home_legs_q2_2, q2.home_legs3 AS home_legs_q2_3, q2.home_legs4 AS home_legs_q2_4,
      q2.guest_score AS guest_score_q2, q2.home_score AS home_score_q2,
      q3.guest_pos1 AS guest_pos1_q3, q3.guest_pos2 AS guest_pos2_q3, q3.guest_pos3 AS guest_pos3_q3, q3.guest_pos4 AS guest_pos4_q3,
      q3.guest_pos5 AS guest_pos5_q3, q3.guest_pos6 AS guest_pos6_q3, q3.guest_pos7 AS guest_pos7_q3, q3.guest_pos8 AS guest_pos8_q3,
      q3.home_pos1 AS home_pos1_q3, q3.home_pos2 AS home_pos2_q3, q3.home_pos3 AS home_pos3_q3, q3.home_pos4 AS home_pos4_q3,
      q3.home_pos5 AS home_pos5_q3, q3.home_pos6 AS home_pos6_q3, q3.home_pos7 AS home_pos7_q3, q3.home_pos8 AS home_pos8_q3,
      q3.guest_legs1 AS guest_legs_q3_1, q3.guest_legs2 AS guest_legs_q3_2, q3.guest_legs3 AS guest_legs_q3_3, q3.guest_legs4 AS guest_legs_q3_4,
      q3.home_legs1 AS home_legs_q3_1, q3.home_legs2 AS home_legs_q3_2, q3.home_legs3 AS home_legs_q3_3, q3.home_legs4 AS home_legs_q3_4,
      q3.guest_score AS guest_score_q3, q3.home_score AS home_score_q3,
      q4.guest_pos1 AS guest_pos1_q4, q4.guest_pos2 AS guest_pos2_q4, q4.guest_pos3 AS guest_pos3_q4, q4.guest_pos4 AS guest_pos4_q4,
      q4.guest_pos5 AS guest_pos5_q4, q4.guest_pos6 AS guest_pos6_q4, q4.guest_pos7 AS guest_pos7_q4, q4.guest_pos8 AS guest_pos8_q4,
      q4.home_pos1 AS home_pos1_q4, q4.home_pos2 AS home_pos2_q4, q4.home_pos3 AS home_pos3_q4, q4.home_pos4 AS home_pos4_q4,
      q4.home_pos5 AS home_pos5_q4, q4.home_pos6 AS home_pos6_q4, q4.home_pos7 AS home_pos7_q4, q4.home_pos8 AS home_pos8_q4,
      q4.guest_legs1 AS guest_legs_q4_1, q4.guest_legs2 AS guest_legs_q4_2, q4.guest_legs3 AS guest_legs_q4_3, q4.guest_legs4 AS guest_legs_q4_4,
      q4.home_legs1 AS home_legs_q4_1, q4.home_legs2 AS home_legs_q4_2, q4.home_legs3 AS home_legs_q4_3, q4.home_legs4 AS home_legs_q4_4,
      q4.guest_score AS guest_score_q4, q4.home_score AS home_score_q4
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
    WHERE m.id = $1;
  `;
  const values = [matchId];

  const resultRows = await pool.query(query, values);
  if (resultRows.rowCount === 0) {
    throw new Error(`Match ${matchId} not found`);
  }
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
          legs: {
            m1: resultRows.rows[0].guest_legs_q1_1,
            m2: resultRows.rows[0].guest_legs_q1_2,
            m3: resultRows.rows[0].guest_legs_q1_3,
            m4: resultRows.rows[0].guest_legs_q1_4
          },
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
          legs: {
            m1: resultRows.rows[0].home_legs_q1_1,
            m2: resultRows.rows[0].home_legs_q1_2,
            m3: resultRows.rows[0].home_legs_q1_3,
            m4: resultRows.rows[0].home_legs_q1_4
          },
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
          legs: {
            m1: resultRows.rows[0].guest_legs_q2_1,
            m2: resultRows.rows[0].guest_legs_q2_2,
            m3: resultRows.rows[0].guest_legs_q2_3,
            m4: resultRows.rows[0].guest_legs_q2_4
          },
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
          legs: {
            m1: resultRows.rows[0].home_legs_q2_1,
            m2: resultRows.rows[0].home_legs_q2_2,
            m3: resultRows.rows[0].home_legs_q2_3,
            m4: resultRows.rows[0].home_legs_q2_4
          },
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
          legs: {
            m1: resultRows.rows[0].guest_legs_q3_1,
            m2: resultRows.rows[0].guest_legs_q3_2,
            m3: resultRows.rows[0].guest_legs_q3_3,
            m4: resultRows.rows[0].guest_legs_q3_4
          },
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
          legs: {
            m1: resultRows.rows[0].home_legs_q3_1,
            m2: resultRows.rows[0].home_legs_q3_2,
            m3: resultRows.rows[0].home_legs_q3_3,
            m4: resultRows.rows[0].home_legs_q3_4
          },
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
          legs: {
            m1: resultRows.rows[0].guest_legs_q4_1,
            m2: resultRows.rows[0].guest_legs_q4_2,
            m3: resultRows.rows[0].guest_legs_q4_3,
            m4: resultRows.rows[0].guest_legs_q4_4
          },
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
          legs: {
            m1: resultRows.rows[0].home_legs_q4_1,
            m2: resultRows.rows[0].home_legs_q4_2,
            m3: resultRows.rows[0].home_legs_q4_3,
            m4: resultRows.rows[0].home_legs_q4_4
          },
          score: resultRows.rows[0].home_score_q4
        }
      }
    }
  };
  return result;
};

export const updateMatchReq = async (req: Request, res: Response): Promise<void> => {
  const matchUpdate: MatchUpdateDto = req.body;
  console.log(`Update match ${matchUpdate.id} at ${new Date().toISOString()}`);

  try {
    await updateMatch(matchUpdate);
    res.status(200).send('Match updated');
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const updateMatch = async (matchUpdate: MatchUpdateDto): Promise<void> => {
  const matchQuery = `
    UPDATE matches
    SET status = $2, status_changed_at = $3, status_changed_by = $4
    WHERE id = $1;
  `
  const matchValues = [matchUpdate.id, matchUpdate.status, matchUpdate.statusChangetAt, matchUpdate.statusChangedBy];
  const matchResult = await pool.query(matchQuery, matchValues);
  if (matchResult.rowCount === 0) {
    throw new Error('Match not updated');
  }

  const quarterQuery = `
    UPDATE match_details
    SET guest_pos1 = $3, guest_pos2 = $4, guest_pos3 = $5, guest_pos4 = $6, guest_pos5 = $7, guest_pos6 = $8, guest_pos7 = $9, guest_pos8 = $10,
      home_pos1 = $11, home_pos2 = $12, home_pos3 = $13, home_pos4 = $14, home_pos5 = $15, home_pos6 = $16, home_pos7 = $17, home_pos8 = $18,
      guest_legs1 = $19, guest_legs2 = $20, guest_legs3 = $21, guest_legs4 = $22, home_legs1 = $23, home_legs2 = $24, home_legs3 = $25, home_legs4 = $26,
      guest_score = $27, home_score = $28
    WHERE match_id = $1 AND quarter = $2;
  `;
  const q1Values = [
    matchUpdate.id, 1,
    matchUpdate.quarters.q1.guest.pos1, matchUpdate.quarters.q1.guest.pos2, matchUpdate.quarters.q1.guest.pos3, matchUpdate.quarters.q1.guest.pos4,
    matchUpdate.quarters.q1.guest.pos5, matchUpdate.quarters.q1.guest.pos6, matchUpdate.quarters.q1.guest.pos7, matchUpdate.quarters.q1.guest.pos8,
    matchUpdate.quarters.q1.home.pos1, matchUpdate.quarters.q1.home.pos2, matchUpdate.quarters.q1.home.pos3, matchUpdate.quarters.q1.home.pos4,
    matchUpdate.quarters.q1.home.pos5, matchUpdate.quarters.q1.home.pos6, matchUpdate.quarters.q1.home.pos7, matchUpdate.quarters.q1.home.pos8,
    matchUpdate.quarters.q1.guest.legs.m1, matchUpdate.quarters.q1.guest.legs.m2, matchUpdate.quarters.q1.guest.legs.m3, matchUpdate.quarters.q1.guest.legs.m4,
    matchUpdate.quarters.q1.home.legs.m1, matchUpdate.quarters.q1.home.legs.m2, matchUpdate.quarters.q1.home.legs.m3, matchUpdate.quarters.q1.home.legs.m4,
    matchUpdate.quarters.q1.guest.score, matchUpdate.quarters.q1.home.score
  ];
  const q1Result = await pool.query(quarterQuery, q1Values);
  if (q1Result.rowCount === 0) {
    throw new Error('Match details Q1 not updated');
  }

  const q2Values = [
    matchUpdate.id, 2,
    matchUpdate.quarters.q2.guest.pos1, matchUpdate.quarters.q2.guest.pos2, matchUpdate.quarters.q2.guest.pos3, matchUpdate.quarters.q2.guest.pos4,
    matchUpdate.quarters.q2.guest.pos5, matchUpdate.quarters.q2.guest.pos6, matchUpdate.quarters.q2.guest.pos7, matchUpdate.quarters.q2.guest.pos8,
    matchUpdate.quarters.q2.home.pos1, matchUpdate.quarters.q2.home.pos2, matchUpdate.quarters.q2.home.pos3, matchUpdate.quarters.q2.home.pos4,
    matchUpdate.quarters.q2.home.pos5, matchUpdate.quarters.q2.home.pos6, matchUpdate.quarters.q2.home.pos7, matchUpdate.quarters.q2.home.pos8,
    matchUpdate.quarters.q2.guest.legs.m1, matchUpdate.quarters.q2.guest.legs.m2, matchUpdate.quarters.q2.guest.legs.m3, matchUpdate.quarters.q2.guest.legs.m4,
    matchUpdate.quarters.q2.home.legs.m1, matchUpdate.quarters.q2.home.legs.m2, matchUpdate.quarters.q2.home.legs.m3, matchUpdate.quarters.q2.home.legs.m4,
    matchUpdate.quarters.q2.guest.score, matchUpdate.quarters.q2.home.score
  ];
  const q2Result = await pool.query(quarterQuery, q2Values);
  if (q2Result.rowCount === 0) {
    throw new Error('Match details Q2 not updated');
  }

  const q3Values = [
    matchUpdate.id, 3,
    matchUpdate.quarters.q3.guest.pos1, matchUpdate.quarters.q3.guest.pos2, matchUpdate.quarters.q3.guest.pos3, matchUpdate.quarters.q3.guest.pos4,
    matchUpdate.quarters.q3.guest.pos5, matchUpdate.quarters.q3.guest.pos6, matchUpdate.quarters.q3.guest.pos7, matchUpdate.quarters.q3.guest.pos8,
    matchUpdate.quarters.q3.home.pos1, matchUpdate.quarters.q3.home.pos2, matchUpdate.quarters.q3.home.pos3, matchUpdate.quarters.q3.home.pos4,
    matchUpdate.quarters.q3.home.pos5, matchUpdate.quarters.q3.home.pos6, matchUpdate.quarters.q3.home.pos7, matchUpdate.quarters.q3.home.pos8,
    matchUpdate.quarters.q3.guest.legs.m1, matchUpdate.quarters.q3.guest.legs.m2, matchUpdate.quarters.q3.guest.legs.m3, matchUpdate.quarters.q3.guest.legs.m4,
    matchUpdate.quarters.q3.home.legs.m1, matchUpdate.quarters.q3.home.legs.m2, matchUpdate.quarters.q3.home.legs.m3, matchUpdate.quarters.q3.home.legs.m4,
    matchUpdate.quarters.q3.guest.score, matchUpdate.quarters.q3.home.score
  ];
  const q3Result = await pool.query(quarterQuery, q3Values);
  if (q3Result.rowCount === 0) {
    throw new Error('Match details Q3 not updated');
  }

  const q4Values = [
    matchUpdate.id, 4,
    matchUpdate.quarters.q4.guest.pos1, matchUpdate.quarters.q4.guest.pos2, matchUpdate.quarters.q4.guest.pos3, matchUpdate.quarters.q4.guest.pos4,
    matchUpdate.quarters.q4.guest.pos5, matchUpdate.quarters.q4.guest.pos6, matchUpdate.quarters.q4.guest.pos7, matchUpdate.quarters.q4.guest.pos8,
    matchUpdate.quarters.q4.home.pos1, matchUpdate.quarters.q4.home.pos2, matchUpdate.quarters.q4.home.pos3, matchUpdate.quarters.q4.home.pos4,
    matchUpdate.quarters.q4.home.pos5, matchUpdate.quarters.q4.home.pos6, matchUpdate.quarters.q4.home.pos7, matchUpdate.quarters.q4.home.pos8,
    matchUpdate.quarters.q4.guest.legs.m1, matchUpdate.quarters.q4.guest.legs.m2, matchUpdate.quarters.q4.guest.legs.m3, matchUpdate.quarters.q4.guest.legs.m4,
    matchUpdate.quarters.q4.home.legs.m1, matchUpdate.quarters.q4.home.legs.m2, matchUpdate.quarters.q4.home.legs.m3, matchUpdate.quarters.q4.home.legs.m4,
    matchUpdate.quarters.q4.guest.score, matchUpdate.quarters.q4.home.score
  ];
  const q4Result = await pool.query(quarterQuery, q4Values);
  if (q4Result.rowCount === 0) {
    throw new Error('Match details Q4 not updated');
  }
};
