import { Request, Response } from 'express';
import { createPlayer } from './playerController.js';
import pool from '../config/db.js';
import { requestPasswordCreate } from '../middleware/authorization.js';
import { v4 as uuidv4 } from 'uuid';

interface TeamRequestBody {
  teamEmail: string;
  teamMembers?: string[];
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

export const createTeamReq = async (req: Request<{}, {}, TeamRequestBody>, res: Response): Promise<void> => {
  const { teamEmail, teamMembers, teamName, username } = req.body;

  try {
    const createTeamResult = await createTeam(teamEmail, teamName, username, teamMembers);
    if (!createTeamResult) {
      res.status(500).send('Some error has occurred');
      return;
    }
    if ('error' in createTeamResult) {
      res.status(500).send(createTeamResult.error);
      return;
    }
    res.status(201).send({ message: 'New Team created', teamId: createTeamResult.id });
  } catch (err) {
    console.error(err);
    res.status(500).send((err as Error).message as string || 'Some error has occurred');
  }
};
const createTeam = async (teamEmail: string, teamName: string, username: string, teamMembers?: string[] ): Promise<
  {
    id: string;
    teamName: string;
    teamEmail: string;
    username: string;
  } | {
    error: string;
  } | undefined
  > => {
  const userRoleIdQuery = 'SELECT id FROM roles WHERE role = $1';
  const userRoleIdResult = await pool.query(userRoleIdQuery, ['USER']);
  const userRoleId = userRoleIdResult.rows[0].id;

  const query = `
    INSERT INTO users (id, team_name, username, user_email, role_id, archived)
    VALUES ($1, $2, $3, $4, $5, $7)
    RETURNING id;
  `;
  const values = [uuidv4(), teamName, username, teamEmail, userRoleId, true, false];

  const result = await pool.query(query, values);
  const firtsPasswordRequest = await requestPasswordCreate(result.rows[0].id);
  if (!firtsPasswordRequest) {
    return { error: 'Some error has occurred during pasword creation request'};
  }

  if (teamMembers?.length) {
    const membersCreated: string[] = []
    teamMembers.forEach(async (member) => {
      const createdMember = await createPlayer(member, result.rows[0].id);
      createdMember && membersCreated.push(createdMember.id);
    });
  }
  return result.rows[0];
};

export const getAllTeamsReq = async (_req: Request, res: Response) => {
  try {
    const teams: TeamDto[] | undefined = await getAllTeams();
    if (!teams) {
      res.status(500).send('Some error has occurred');
      return;
    }
    res.status(200).send(teams);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
}
const getAllTeams = async (): Promise<TeamDto[] | undefined> => {
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
      LEFT JOIN roles as r
        ON t.role_id = r.id
      WHERE t.archived = false
        AND r.role = 'USER'
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

    return Array.from(teamsMap.values());
  }

export const getTeamReq = async (req: Request, res: Response) => {
  const teamId = req.params.id;

  try {
    const team = await getTeam(teamId);

    if (!team || !team.team_id) {
      return res.status(404).send({ message: 'Team not found' });
    }

    res.status(200).send(team);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const getTeam = async (teamId: string): Promise<{
  contact_email: string,
  player_id: string,
  player_name: string
  team_id: string,
  team_name: string
  username: string,
} | undefined> => {
  const query = `
      SELECT teams.id AS team_id, team_name, username, user_email as contact_email, players.id as player_id, players.name as player_name
      FROM users AS teams
      LEFT JOIN players
        ON users.id = players.team_id
        AND players.archived = false
      WHERE id = $1`;
    const result = await pool.query(query, [teamId]);

  return result.rows[0];
}

export const isTeamUsernameUniqueReq = async (req: Request, res: Response) => {
  const username = req.params.username;

  try {
    const isUnique = await isTeamUsernameUnique(username);

    if (isUnique) {
      return res.status(200).send({ unique: true });
    }

    res.status(200).send({ unique: false });
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};

const isTeamUsernameUnique = async (username: string): Promise<boolean> => {
  const query = `
    SELECT username
    FROM users
    WHERE username = $1`;
  const result = await pool.query(query, [username]);

  return result.rows.length === 0;
}