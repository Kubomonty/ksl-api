import { authenticate } from '../middleware/authorization.js';
import { createPlayer } from '../controllers/playerController.js';
import express from 'express';

const router = express.Router();

router.post('/create-player', authenticate, createPlayer);

export default router;