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

export const updateTeamReq = async (req: Request, res: Response) => {
  const { teamEmail, teamId, teamMembers, teamName } = req.body;
  console.log(`Update team attempt for team ${teamId} at ${new Date().toISOString()}`);
  try {
    const updateTeamResult = await updateTeam(teamEmail, teamId, teamName, teamMembers);
    if (!updateTeamResult) {
      res.status(500).send('Some error has occurred');
      return;
    }
    res.status(200).send({ message: 'Team updated' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const updateTeam = async (teamEmail: string, teamId: string, teamName: string, teamMembers?: {id: string, name: string}[]): Promise<boolean> => {
  const teamQuery = `
    Select *
    FROM users u
    LEFT JOIN players p
      ON u.id = p.user_id
    WHERE u.id = $1
  `
  const result = await pool.query(teamQuery, [teamId]);
  const team: TeamDto = {
    id: result.rows[0].team_id,
    players: [],
    teamEmail: result.rows[0].team_email,
    teamName: result.rows[0].team_name
  };
  result.rows.forEach(row => {
    if (!row.player_id) return;
    team.players.push({ id: row.player_id, name: row.player_name });
  });
  if (!team.id) return false;
  if (teamEmail !== team.teamEmail) {
    const updateEmailQuery = `
      UPDATE users
      SET user_email = $1
      WHERE id = $2
    `;
    await pool.query(updateEmailQuery, [teamEmail, teamId]);
  };
  if (teamName !== team.teamName) {
    const updateNameQuery = `
      UPDATE users
      SET team_name = $1
      WHERE id = $2
    `;
    await pool.query(updateNameQuery, [teamName, teamId]);
  };
  console.log('team', team)
  if (teamMembers?.length) {
    const newMembers = teamMembers.filter(member => member.id.startsWith('NEW-')).map(member => {
      return { id: uuidv4(), name: member.name, user_id: teamId };
    });
    if (newMembers.length) {
      const insertPlayerQuery = `
        INSERT INTO players (id, name, user_id)
        VALUES ${newMembers.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ')}
      `;
      const values = newMembers.flatMap(member => [member.id, member.name, member.user_id]);
      await pool.query(insertPlayerQuery, values);
    };
    const removedMembers = team.players.filter(player => !teamMembers.find(member => member.id === player.id));
    if (removedMembers.length) {
      const archivePlayersQuery = `
        UPDATE players
        SET archived_at = $1
        WHERE id = ANY($2::uuid[])
      `;
      const removedMemberIds = removedMembers.map(member => member.id);
      await pool.query(archivePlayersQuery, [new Date(), removedMemberIds]);
    };
    const updatedMembers: { id: string, name: string }[] = [];
    teamMembers.forEach(member => {
      const existingMember = team.players.find(player => player.id === member.id);
      if (existingMember && existingMember.name !== member.name) {
        updatedMembers.push({ id: member.id, name: member.name });
      };
    });
    if (updatedMembers.length) {
      const updatePlayersQuery = `
        UPDATE players
        SET name = CASE id
          ${updatedMembers.map((_, i) => `WHEN $${i * 2 + 1} THEN $${i * 2 + 2}`).join(' ')}
        END
        WHERE id IN (${updatedMembers.map((_, i) => `$${i * 2 + 1}`).join(', ')})
      `;
      const values = updatedMembers.flatMap(member => [member.id, member.name]);
      await pool.query(updatePlayersQuery, values);
    };
  };
  return true;
};

export const createTeamReq = async (req: Request<{}, {}, TeamRequestBody>, res: Response): Promise<void> => {
  const { teamEmail, teamMembers, teamName, username } = req.body;
  console.log(`Create new team attempt for team name ${teamName}, username ${username} at ${new Date().toISOString()}`);
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
    INSERT INTO users (id, team_name, username, user_email, role_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `;
  const values = [uuidv4(), teamName, username, teamEmail, userRoleId];

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
  console.log(`Get all teams attempt at ${new Date().toISOString()}`);
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
};
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
      AND p.archived_at IS NULL
    LEFT JOIN roles as r
      ON t.role_id = r.id
    WHERE t.archived_at IS NULL
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
};

export const getTeamReq = async (req: Request, res: Response) => {
  const teamId = req.params.id;
  console.log(`Get team attempt for team id ${teamId} at ${new Date().toISOString()}`);
  try {
    const team = await getTeam(teamId);

    if (!team || !team.id) {
      return res.status(404).send({ message: 'Team not found' });
    }

    res.status(200).send(team);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const getTeam = async (teamId: string): Promise<TeamDto | undefined> => {
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
        AND p.archived_at IS NULL
      LEFT JOIN roles as r
        ON t.role_id = r.id
      WHERE t.archived_at IS NULL
        AND r.role = 'USER'
        AND t.id = $1
      ORDER BY p.name ASC`;
  const result = await pool.query(query, [teamId]);
  const team: TeamDto = {
    id: result.rows[0].team_id,
    players: [],
    teamEmail: result.rows[0].team_email,
    teamName: result.rows[0].team_name
  };
  result.rows.forEach(row => {
    if (!row.player_id) return;
    team.players.push({ id: row.player_id, name: row.player_name });
  });

  return team;
};

export const isTeamUsernameUniqueReq = async (req: Request, res: Response) => {
  const username = req.params.username;
  console.log(`Check if team username ${username} is unique at ${new Date().toISOString()}`);
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
};