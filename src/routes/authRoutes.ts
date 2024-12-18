import { changePasswordReq, createAdmin, login, requestPasswordReset, resetPassword } from '../middleware/authorization.js';
import { authenticate, authorizeAdmin } from '../middleware/authorization.js';
import { Router } from 'express';

const router = Router();

router.put('/change-password', authenticate, changePasswordReq);

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`login attempt for ${username} at ${new Date().toISOString()}`);
  try {
      const response = await login(username, password);
      res.status(200).send({ ...response });
  } catch (err) {
      res.status(400).send((err as Error).message);
  }
});

router.post('/request-password-reset', async (req, res, next) => {
  console.log(`password reset request for ${req.body.email} at ${new Date().toISOString()}`);
  try {
      requestPasswordReset(req, res, next);
  } catch (err) {
      res.status(400).send((err as Error).message);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
      resetPassword(req, res, next);
  } catch (err) {
      res.status(400).send((err as Error).message);
  }
});

router.post('/create-admin', authenticate, authorizeAdmin, createAdmin);

export default router;