import { createMatchReq, getMatchDetailsReq, getMatchesPageReq } from '../controllers/matchController.js';
import { authenticate } from '../middleware/authorization.js';
import express from 'express';

const router = express.Router();

router.get('/match', getMatchesPageReq);
router.get('/match/:id', getMatchDetailsReq);
// router.put('/matches/:id', authenticate, updateMatchByIdReq);
router.post('/match', authenticate, createMatchReq);

export default router;