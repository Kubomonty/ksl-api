import { createTeamReq, getAllTeamsReq, getTeamReq, isTeamUsernameUniqueReq } from '../controllers/teamController.js';
import { authenticate } from '../middleware/authorization.js';
import express from 'express';

const router = express.Router();

router.get('/teams/is-unique/:username', isTeamUsernameUniqueReq);
router.get('/teams/:id', getTeamReq);
router.get('/teams', getAllTeamsReq);
router.head('/teams', getAllTeamsReq);
router.post('/create-team', authenticate, createTeamReq);

export default router;