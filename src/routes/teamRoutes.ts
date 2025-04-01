import {
  cancelTeamReq,
  createTeamReq,
  getActiveTeamReq,
  getAllActiveTeamsReq,
  getAllTeamsReq,
  getTeamReq,
  getTeamStandingsReq,
  isTeamUsernameUniqueReq,
  updateTeamOrderReq,
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
router.put('/team/:id', authenticate, authorizeAdmin, updateTeamReq);
router.delete('/team/:id', authenticate, authorizeAdmin, cancelTeamReq);
router.put('/team/:id/player-order',authenticate, updateTeamOrderReq);
router.get('/team', getAllTeamsReq);
router.head('/team', getAllTeamsReq);
router.post('/team', authenticate, createTeamReq);

export default router;