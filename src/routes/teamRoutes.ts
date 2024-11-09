import { createTeamReq, getAllTeamsReq, getTeamReq, isTeamUsernameUniqueReq, updateTeamReq } from '../controllers/teamController.js';
import { authenticate } from '../middleware/authorization.js';
import express from 'express';

const router = express.Router();

router.get('/team/is-unique/:username', isTeamUsernameUniqueReq);
router.get('/team/:id', getTeamReq);
router.put('/team/:id', authenticate, updateTeamReq);
router.get('/team', getAllTeamsReq);
router.head('/team', getAllTeamsReq);
router.post('/team', authenticate, createTeamReq);

export default router;