import express, { NextFunction, Request, Response } from 'express';
import authRoutes from './routes/authRoutes.js';
import { authenticate } from './middleware/authorization.js';
import cors from 'cors';
// import { createDbBase } from './dbInit.js';
import dotenv from 'dotenv';
import playerRoutes from './routes/playerRoutes.js';
import teamRoutes from './routes/teamRoutes.js';

const port = process.env.PORT || 8080;
dotenv.config();

const app = express();
app.use(cors());

app.use(express.json());

app.use('/api', playerRoutes);
app.use('/api', teamRoutes);
app.use('/auth', authRoutes);

app.use('/api/protected', authenticate, (req, res) => {
  res.send('This is a protected route');
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// createDbBase();

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
