import { createMatchOvertimeReq, createMatchReq, getMatchDetailsReq, getMatchesPageReq, reopenMatchReq, updateMatchOvertimeReq, updateMatchReq } from '../controllers/matchController.js';
import { authenticate, authorizeAdmin } from '../middleware/authorization.js';
import express from 'express';

const router = express.Router();

router.get('/match', getMatchesPageReq);
router.get('/match/:id', getMatchDetailsReq);
router.put('/match/:id', authenticate, updateMatchReq);
router.put('/match/:id/reopen', authenticate, authorizeAdmin, reopenMatchReq);
router.post('/match', authenticate, createMatchReq);
router.post('/match/overtime', authenticate, createMatchOvertimeReq);
router.put('/match/overtime/:id', authenticate, updateMatchOvertimeReq);

export default router;