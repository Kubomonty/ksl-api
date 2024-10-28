import { authenticate } from '../middleware/authorization.js';
import { createPlayer } from '../controllers/playerController.js';
import express from 'express';
import { VercelRequest, VercelResponse } from '@vercel/node';

const app = express();
const router = express.Router();

router.post('/create-player', authenticate, createPlayer);

app.use('/api', router);

export default (req: VercelRequest, res: VercelResponse) => {
  app(req, res);
};