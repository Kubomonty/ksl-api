import {
  createSeasonReq, getSeasonsReq, setActiveSeasonReq
} from '../controllers/seasonController.js';
import { authenticate, authorizeAdmin } from '../middleware/authorization.js';
import express from 'express';

const router = express.Router();

router.get('/seasons', getSeasonsReq);
router.put('/seasons/:id', authenticate, authorizeAdmin, setActiveSeasonReq);
router.post('/seasons', authenticate, authorizeAdmin, createSeasonReq);

export default router;