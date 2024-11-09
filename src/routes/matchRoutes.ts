import { createMatchReq, getMatchesPageReq } from '../controllers/matchController.js';
import { authenticate } from '../middleware/authorization.js';
import express from 'express';

const router = express.Router();

router.get('/matches', getMatchesPageReq);
// router.get('/matches/:id', getMatchByIdReq);
// router.put('/matches/:id', authenticate, updateMatchByIdReq);
router.post('/match', authenticate, createMatchReq);

export default router;