import { Request, Response } from 'express';
import pool from '../config/db.js';
import { requestPasswordCreate } from '../middleware/authorization.js';
import { v4 as uuidv4 } from 'uuid';

interface TeamRequestBody {
  teamEmail: string;
  teamName: string;
  username: string;
}

interface PlayerDto {
  id: string;
  name: string;
}

interface TeamDto {
  players: PlayerDto[];
  id: string;
  teamName: string;
  teamEmail: string;
}

export const createTeam = async (req: Request<{}, {}, TeamRequestBody>, res: Response): Promise<void> => {
  const { teamName, username, teamEmail } = req.body;
  const userRoleIdQuery = 'SELECT id FROM roles WHERE role = $1';
  const userRoleIdResult = await pool.query(userRoleIdQuery, ['USER']);
  const userRoleId = userRoleIdResult.rows[0].id;

  try {
    const query = `
      INSERT INTO users (id, team_name, username, user_email, role_id, is_team, archived)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const values = [uuidv4(), teamName, username, teamEmail, userRoleId, true, false];

    const result = await pool.query(query, values);
    const firtsPasswordRequest = await requestPasswordCreate(result.rows[0].id);
    if (!firtsPasswordRequest) {
      res.status(500).send('Some error has occurred during pasword creation request');
      return;
    }
    res.status(201).send({ message: 'New Team created', teamId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).send((err as Error).message as string || 'Some error has occurred');
  }
};

export const getAllTeams = async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        t.id AS team_id,
        t.team_name,
        t.user_email AS team_email,
        p.id AS player_id,
        p.name AS player_name
      FROM users AS t
      LEFT JOIN players AS p
        ON t.id = p.user_id
        AND p.archived = false
      WHERE t.archived = false
        AND t.is_team = true
      ORDER BY t.team_name ASC, p.name ASC
    `;
    const result = await pool.query(query);
    const teamsMap = new Map<string, TeamDto>();

    result.rows.forEach(row => {
      if (!teamsMap.has(row.team_id)) {
        teamsMap.set(row.team_id, {
          id: row.team_id,
          teamName: row.team_name,
          teamEmail: row.team_email,
          players: [{ id: row.player_id, name: row.player_name }]
        });
      } else {
        const team = teamsMap.get(row.team_id);
        team!.players.push({ id: row.player_id, name: row.player_name });
      }
    });

    const teams: TeamDto[] = Array.from(teamsMap.values());

    res.status(200).send(teams);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
}

export const getTeam = async (req: Request, res: Response) => {
  const teamId = req.params.id;

  try {
    const query = `
      SELECT teams.id AS team_id, team_name, username, user_email as contact_email, players.id as player_id, players.name as player_name
      FROM users AS teams
      LEFT JOIN players
        ON users.id = players.team_id
        AND players.archived = false
      WHERE id = $1`;
    const result = await pool.query(query, [teamId]);

    if (result.rows.length === 0) {
      return res.status(404).send({ message: 'Team not found' });
    }

    res.status(200).send(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};

export const isTeamUsernameUnique = async (req: Request, res: Response) => {
  const username = req.params.username;

  try {
    const query = `
      SELECT username
      FROM users
      WHERE username = $1`;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(200).send({ unique: true });
    }

    res.status(200).send({ unique: false });
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};