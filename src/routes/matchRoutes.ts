import { createMatchReq, getMatchDetailsReq, getMatchesPageReq, updateMatchReq } from '../controllers/matchController.js';
import { authenticate } from '../middleware/authorization.js';
import express from 'express';

const router = express.Router();

router.get('/match', getMatchesPageReq);
router.get('/match/:id', getMatchDetailsReq);
router.put('/match/:id', authenticate, updateMatchReq);
router.post('/match', authenticate, createMatchReq);

export default router;