import {
  cancelTeamReq,
  createTeamReq,
  getActiveTeamReq,
  getAllActiveTeamsReq,
  getAllTeamsReq,
  getTeamReq,
  getTeamStandingsReq,
  isTeamUsernameUniqueReq,
  updateTeamReq
} from '../controllers/teamController.js';
import { authenticate, authorizeAdmin } from '../middleware/authorization.js';
import express from 'express';

const router = express.Router();

router.get('/team/is-unique/:username', isTeamUsernameUniqueReq);
router.get('/team/active/:id', getActiveTeamReq);
router.get('/team/active', getAllActiveTeamsReq);
router.get('/team/standings', getTeamStandingsReq);
router.get('/team/:id', getTeamReq);
router.put('/team/:id', authenticate, updateTeamReq);
router.delete('/team/:id', authenticate, authorizeAdmin, cancelTeamReq);
router.get('/team', getAllTeamsReq);
router.head('/team', getAllTeamsReq);
router.post('/team', authenticate, createTeamReq);

export default router;