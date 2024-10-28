import { createTeam, getAllTeams, getTeam, isTeamUsernameUnique } from '../controllers/teamController.js';
import { authenticate } from '../middleware/authorization.js';
import express from 'express';
import { VercelRequest, VercelResponse } from '@vercel/node';

const app = express();
const router = express.Router();

router.get('/teams/is-unique/:username', isTeamUsernameUnique);
router.get('/teams/:id', getTeam);
router.get('/teams', getAllTeams);
router.post('/create-team', authenticate, createTeam);

app.use('/api', router);

export default (req: VercelRequest, res: VercelResponse) => {
  app(req, res);
};