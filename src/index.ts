import express, { NextFunction, Request, Response } from 'express';
import authRoutes from './routes/authRoutes.js';
import { authenticate } from './middleware/authorization.js';
import cors from 'cors';
import dotenv from 'dotenv';
import playerRoutes from './routes/playerRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import matchRoutes from './routes/matchRoutes.js';

const port = process.env.PORT || 8080;
dotenv.config();

const app = express();
const allowedOrigins = ['https://ksl-ui.vercel.app', 'https://localhost:3000', 'http://localhost:3000', 'https://localhost:8081'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,DELETE',
}));

app.use(express.json());

app.use('/api', playerRoutes);
app.use('/api', teamRoutes);
app.use('/api', matchRoutes);
app.use('/auth', authRoutes);

app.use('/api/protected', authenticate, (req, res) => {
  res.send('This is a protected route');
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
