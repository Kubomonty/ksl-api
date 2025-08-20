import express, { NextFunction, Request, Response } from 'express';
import authRoutes from './routes/authRoutes.js';
import { authenticate } from './middleware/authorization.js';
import cors from 'cors';
import dotenv from 'dotenv';
import matchRoutes from './routes/matchRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import seasonRoutes from './routes/seasonRoutes.js';
import teamRoutes from './routes/teamRoutes.js';

dotenv.config();
const port = process.env.PORT || 8080;
const app = express();

const allowedOrigins = ['http://91.98.112.7', 'https://91.98.112.7', 'https://kesl.sk', 'https://www.kesl.sk'];
app.use(cors({
  origin: (origin, callback) => {
    console.log('Request origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,DELETE',
}));

app.use(express.json());

// API routy
app.use('/api', matchRoutes);
app.use('/api', playerRoutes);
app.use('/api', seasonRoutes);
app.use('/api', teamRoutes);
app.use('/auth', authRoutes);

// Protected route
app.use('/api/protected', authenticate, (req, res) => {
  res.send('This is a protected route');
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Spustenie servera
app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
