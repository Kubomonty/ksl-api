import { authenticate } from '../middleware/authorization.js';
import { createPlayerReq } from '../controllers/playerController.js';
import express from 'express';

const router = express.Router();

router.post('/create-player', authenticate, createPlayerReq);

export default router;
