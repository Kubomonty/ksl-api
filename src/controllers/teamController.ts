import { Request, Response } from 'express';
import { MatchStatus } from '../enums/MatchStatus.enum.js';
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
  playerOrder: number;
}

interface TeamDto {
  players: PlayerDto[];
  id: string;
  teamName: string;
  teamEmail: string;
}

interface MatchDto {
  match_date: string;
  home_team: string;
  home_team_name: string;
  guest_team: string;
  guest_team_name: string;
  match_location: string;
  home_legs: number;
  guest_legs: number;
  home_score?: number;
  guest_score?: number;
  home_overtime_score?: number;
  guest_overtime_score?: number;
}

interface TeamStatsDto {
  team_id: string;
  team_name: string;
  matches: MatchDto[];
}

export const cancelTeamReq = async (req: Request, res: Response) => {
  const teamId = req.params.id;
  console.log(`Cancel team attempt for team ${teamId} at ${new Date().toISOString()}`);

  try {
    const cancelTeamResult = await cancelTeam(teamId);
    if (!cancelTeamResult) {
      res.status(500).send('Some error has occurred');
      return;
    }
    res.status(200).send({ message: 'Team canceled' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};

const cancelTeam = async (teamId: string): Promise<boolean> => {
  const query = `UPDATE users SET archived_at = $1 WHERE id = $2`;
  const result = await pool.query(query, [new Date(), teamId]);

  return !!result.rowCount && result.rowCount > 0;
};

export const updateTeamReq = async (req: Request, res: Response) => {
  const { teamEmail, teamId, teamMembers, teamName } = req.body;
  console.log(`Update team attempt for team ${teamId} at ${new Date().toISOString()}`);
  try {
    const updateTeamResult = await updateTeam(teamEmail.toLowerCase(), teamId, teamName, teamMembers);
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
const updateTeam = async (teamEmail: string, teamId: string, teamName: string, teamMembers?: {id: string, name: string, playerOrder: number}[]): Promise<boolean> => {
  const teamQuery = `
    Select u.id as team_id, u.team_name, u.user_email as team_email, p.id as player_id, p.name as player_name
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
    team.players.push({ id: row.player_id, name: row.player_name, playerOrder: row.player_order });
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
  if (teamMembers?.length) {
    const newMembers = teamMembers.filter(member => member.id.startsWith('NEW-')).map(member => {
      return { id: uuidv4(), name: member.name, player_order: member.playerOrder, user_id: teamId };
    });
    if (newMembers.length) {
      const insertPlayerQuery = `
        INSERT INTO players (id, name, user_id, player_order)
        VALUES ${newMembers.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
      `;
      const values = newMembers.flatMap(member => [member.id, member.name, member.user_id, member.player_order]);
      await pool.query(insertPlayerQuery, values);
    };
    const removedMembers = team.players.filter(player => !teamMembers.find(member => member.id === player.id));
    if (removedMembers.length) {
      const archivePlayersQuery = `
        UPDATE players
        SET
          archived_at = $1,
          player_order = -1
        WHERE id = ANY($2::uuid[])
      `;
      const removedMemberIds = removedMembers.map(member => member.id);
      await pool.query(archivePlayersQuery, [new Date(), removedMemberIds]);
    };
    const updatedMembers: { id: string, name: string, playerOrder: number }[] = [];
    teamMembers.forEach(member => {
      const existingMember = team.players.find(player => player.id === member.id);
      if (existingMember && (existingMember.name !== member.name || existingMember.playerOrder !== member.playerOrder)) {
        updatedMembers.push({ id: member.id, name: member.name, playerOrder: member.playerOrder });
      };
    });
    if (updatedMembers.length) {
      const updatePlayersQuery = `
        UPDATE players
        SET
          name = CASE id
            ${updatedMembers.map((_, i) => `WHEN $${i * 3 + 1} THEN $${i * 3 + 2}`).join(' ')}
          END,
          player_order = CASE id
            ${updatedMembers.map((_, i) => `WHEN $${i * 3 + 1} THEN $${i * 3 + 3}::numeric`).join(' ')}
          END
        WHERE id IN (${updatedMembers.map((_, i) => `$${i * 3 + 1}`).join(', ')})
      `;
      const values = updatedMembers.flatMap(member => [member.id, member.name, member.playerOrder]);
      await pool.query(updatePlayersQuery, values);
    };
  };
  return true;
};

export const createTeamReq = async (req: Request<{}, {}, TeamRequestBody>, res: Response): Promise<void> => {
  const { teamEmail, teamMembers, teamName, username } = req.body;
  console.log(`Create new team attempt for team name ${teamName}, username ${username} at ${new Date().toISOString()}`);
  try {
    const createTeamResult = await createTeam(teamEmail.toLowerCase(), teamName, username.toLocaleLowerCase(), teamMembers);
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
    teamMembers.forEach(async (member, index) => {
      const createdMember = await createPlayer(member, index, result.rows[0].id);
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
      p.name AS player_name,
      p.player_order::numeric
    FROM users AS t
    LEFT JOIN players AS p
      ON t.id = p.user_id
    LEFT JOIN roles as r
      ON t.role_id = r.id
    WHERE r.role = 'USER'
    ORDER BY t.team_name ASC, p.player_order ASC
  `;
  const result = await pool.query(query);
  const teamsMap = new Map<string, TeamDto>();

  result.rows.forEach(row => {
    if (!teamsMap.has(row.team_id)) {
      teamsMap.set(row.team_id, {
        id: row.team_id,
        teamName: row.team_name,
        teamEmail: row.team_email,
        players: [{ id: row.player_id, name: row.player_name, playerOrder: +row.player_order }]
      });
    } else {
      const team = teamsMap.get(row.team_id);
      team!.players.push({ id: row.player_id, name: row.player_name, playerOrder: +row.player_order });
    }
  });

  return Array.from(teamsMap.values());
};
export const getAllActiveTeamsReq = async (_req: Request, res: Response) => {
  console.log(`Get all teams attempt at ${new Date().toISOString()}`);
  try {
    const teams: TeamDto[] | undefined = await getAllActiveTeams();
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
const getAllActiveTeams = async (): Promise<TeamDto[] | undefined> => {
  const query = `
    SELECT
      t.id AS team_id,
      t.team_name,
      t.user_email AS team_email,
      p.id AS player_id,
      p.name AS player_name,
      p.player_order::numeric
    FROM users AS t
    LEFT JOIN players AS p
      ON t.id = p.user_id
      AND p.archived_at IS NULL
    LEFT JOIN roles as r
      ON t.role_id = r.id
    WHERE t.archived_at IS NULL
      AND r.role = 'USER'
    ORDER BY t.team_name ASC, p.player_order ASC
  `;
  const result = await pool.query(query);
  const teamsMap = new Map<string, TeamDto>();

  result.rows.forEach(row => {
    if (!teamsMap.has(row.team_id)) {
      teamsMap.set(row.team_id, {
        id: row.team_id,
        teamName: row.team_name,
        teamEmail: row.team_email,
        players: [{ id: row.player_id, name: row.player_name, playerOrder: +row.player_order }]
      });
    } else {
      const team = teamsMap.get(row.team_id);
      team!.players.push({ id: row.player_id, name: row.player_name, playerOrder: +row.player_order });
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
        p.name AS player_name,
        p.player_order::numeric
      FROM users AS t
      LEFT JOIN players AS p
        ON t.id = p.user_id
      LEFT JOIN roles as r
        ON t.role_id = r.id
      WHERE r.role = 'USER'
        AND t.id = $1
      ORDER BY p.player_order ASC`;
  const result = await pool.query(query, [teamId]);
  const team: TeamDto = {
    id: result.rows[0].team_id,
    players: [],
    teamEmail: result.rows[0].team_email,
    teamName: result.rows[0].team_name
  };
  result.rows.forEach(row => {
    if (!row.player_id) return;
    team.players.push({ id: row.player_id, name: row.player_name, playerOrder: +row.player_order });
  });

  return team;
};
export const getActiveTeamReq = async (req: Request, res: Response) => {
  const teamId = req.params.id;
  console.log(`Get team attempt for team id ${teamId} at ${new Date().toISOString()}`);
  try {
    const team = await getActiveTeam(teamId);

    if (!team || !team.id) {
      return res.status(404).send({ message: 'Team not found' });
    }

    res.status(200).send(team);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const getActiveTeam = async (teamId: string): Promise<TeamDto | undefined> => {
  const query = `
      SELECT
        t.id AS team_id,
        t.team_name,
        t.user_email AS team_email,
        p.id AS player_id,
        p.name AS player_name,
        p.player_order::numeric
      FROM users AS t
      LEFT JOIN players AS p
        ON t.id = p.user_id
        AND p.archived_at IS NULL
      LEFT JOIN roles as r
        ON t.role_id = r.id
      WHERE t.archived_at IS NULL
        AND r.role = 'USER'
        AND t.id = $1
      ORDER BY p.player_order ASC`;
  const result = await pool.query(query, [teamId]);
  const team: TeamDto = {
    id: result.rows[0].team_id,
    players: [],
    teamEmail: result.rows[0].team_email,
    teamName: result.rows[0].team_name
  };
  result.rows.forEach(row => {
    if (!row.player_id) return;
    team.players.push({ id: row.player_id, name: row.player_name, playerOrder: +row.player_order });
  });

  return team;
};

export const getTeamStandingsReq = async (_req: Request, res: Response) => {
  console.log(`Get team standings attempt at ${new Date().toISOString()}`);
  try {
    const standings = await getTeamsStandings();
    if (!standings) {
      res.status(500).send('Some error has occurred');
      return;
    }
    res.status(200).send(standings);
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};
const getTeamsStandings = async () => {
  const query = `
    SELECT
      t.id AS team_id,
      t.team_name,
      m.status,
      m.id as match_id,
      m.match_date,
      m.home_team,
      ht.team_name AS home_team_name,
      m.guest_team,
      gt.team_name AS guest_team_name,
      m.match_location,
      md.home_score,
      md.guest_score,
      COALESCE(md.home_legs1, 0) + COALESCE(md.home_legs2, 0) + COALESCE(md.home_legs3, 0) + COALESCE(md.home_legs4, 0) AS home_legs,
      COALESCE(md.guest_legs1, 0) + COALESCE(md.guest_legs2, 0) + COALESCE(md.guest_legs3, 0) + COALESCE(md.guest_legs4, 0) AS guest_legs,
      md.quarter,
      mo.home_score AS home_overtime_score,
      mo.guest_score AS guest_overtime_score
    FROM users AS t
    JOIN roles AS r
      ON t.role_id = r.id
      AND r.role = 'USER'
    LEFT JOIN matches AS m
      ON t.id = m.home_team OR t.id = m.guest_team
    LEFT JOIN users AS ht
      ON m.home_team = ht.id
    LEFT JOIN users AS gt
      ON m.guest_team = gt.id
    LEFT JOIN match_details as md
      ON m.id = md.match_id
    LEFT JOIN match_overtimes as mo
      ON m.id = mo.match_id
    WHERE t.archived_at IS NULL
    ORDER BY t.id ASC, m.match_date DESC, m.id ASC, md.quarter ASC
  `;
  const result = await pool.query(query);
  const rows = result.rows;
  const teamsMap = new Map();
  rows.forEach(row => {
    if (!teamsMap.has(row.team_id)) {
      teamsMap.set(row.team_id, {
        team_id: row.team_id,
        team_name: row.team_name,
        matches: []
      });
    }
    const team = teamsMap.get(row.team_id);
    if (row.status === MatchStatus.FINISHED) {
      if (+row.quarter === 1) {
        team.matches.push({
          match_date: row.match_date,
          home_team: row.home_team,
          home_team_name: row.home_team_name,
          guest_team: row.guest_team,
          guest_team_name: row.guest_team_name,
          match_location: row.match_location,
          home_legs: +row.home_legs,
          guest_legs: +row.guest_legs,
          quarter: +row.quarter,
          home_overtime_score: +row.home_overtime_score,
          guest_overtime_score: +row.guest_overtime_score
        });
      } else {
        team.matches[team.matches.length - 1].home_legs += +row.home_legs;
        team.matches[team.matches.length - 1].guest_legs += +row.guest_legs;
        console.log('team.matches q2-4', team.matches);
      }
      if (+row.quarter === 4) {
        team.matches[team.matches.length - 1].home_score = +row.home_score;
        team.matches[team.matches.length - 1].guest_score = +row.guest_score;
      }
    }
  });
  console.log('teamsMap', teamsMap);
  const resultArray = Array.from(teamsMap.values()).map((teamStats: TeamStatsDto) => {
    const retObj: {
      place?: number;
      teamId: string;
      teamName: string;
      matchesPlayed: number;
      points: number;
      wins: number;
      losses: number;
      overTimeWins: number;
      overTimeLosses: number;
      legsWon: number;
      legsLost: number;
      gamesWon: number;
      gamesLost: number;
      matches: {
        matchDate: string;
        homeTeam: string;
        homeTeamName: string;
        guestTeam: string;
        guestTeamName: string;
        matchLocation: string;
        homeLegs: number;
        guestLegs: number;
        homeScore?: number;
        guestScore?: number;
        homeOvertimeScore?: number;
        guestOvertimeScore?: number;
      }[];
    } = {
      teamId: teamStats.team_id,
      teamName: teamStats.team_name,
      matchesPlayed: 0,
      points: 0,
      wins: 0,
      losses: 0,
      overTimeWins: 0,
      overTimeLosses: 0,
      legsWon: 0,
      legsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      matches: []
    };

    teamStats.matches.forEach(match => {
      if (match.home_team === teamStats.team_id) {
        retObj.legsWon += match.home_legs;
        retObj.legsLost += match.guest_legs;
        retObj.gamesWon += match.home_score ?? 0;
        retObj.gamesLost += match.guest_score ?? 0;
        if ((match.home_score ?? 0) > (match.guest_score ?? 0)) {
          retObj.wins++;
          retObj.points += 2;
        } else if ((match.home_score ?? 0) < (match.guest_score ?? 0)) {
          retObj.losses++;
        }
        else if ((match.home_overtime_score ?? 0) > (match.guest_overtime_score ?? 0)) {
          retObj.overTimeWins++;
          retObj.points += 1;
        } else if ((match.home_overtime_score ?? 0) < (match.guest_overtime_score ?? 0)){
          retObj.overTimeLosses++;
        }
      } else {
        retObj.legsWon += match.guest_legs;
        retObj.legsLost += match.home_legs;
        retObj.gamesWon += match.guest_score ?? 0;
        retObj.gamesLost += match.home_score ?? 0;
        if ((match.guest_score ?? 0) > (match.home_score ?? 0)) {
          retObj.wins++;
          retObj.points += 2;
        } else if ((match.guest_score ?? 0) < (match.home_score ?? 0)) {
          retObj.losses++;
        }
        else if ((match.guest_overtime_score ?? 0) > (match.home_overtime_score ?? 0)) {
          retObj.overTimeWins++;
          retObj.points += 1;
        } else if ((match.guest_overtime_score ?? 0) < (match.home_overtime_score ?? 0)){
          retObj.overTimeLosses++;
        }
      }
      retObj.matchesPlayed++;
      retObj.matches.push({
        matchDate: match.match_date,
        homeTeam: match.home_team,
        homeTeamName: match.home_team_name,
        guestTeam: match.guest_team,
        guestTeamName: match.guest_team_name,
        matchLocation: match.match_location,
        homeLegs: match.home_legs,
        guestLegs: match.guest_legs,
        homeScore: match.home_score,
        guestScore: match.guest_score,
        homeOvertimeScore: match.home_overtime_score,
        guestOvertimeScore: match.guest_overtime_score
      });
    });

    return retObj;
  });

  resultArray.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    } else if (b.wins !== a.wins) {
      return b.wins - a.wins;
    } else if (b.legsWon !== a.legsWon) {
      return b.legsWon - a.legsWon;
    } else {
      return a.teamName.localeCompare(b.teamName);
    }
  });

  // Assign place property
  resultArray.forEach((team, index) => {
    team.place = index + 1;
  });

  return resultArray;
};

export const isTeamUsernameUniqueReq = async (req: Request, res: Response) => {
  const username = req.params.username;
  console.log(`Check if team username ${username} is unique at ${new Date().toISOString()}`);
  try {
    const isUnique = await isTeamUsernameUnique(username.toLocaleLowerCase());

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