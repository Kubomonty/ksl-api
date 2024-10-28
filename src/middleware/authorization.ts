import { Request, RequestHandler, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

interface AdminRequestBody {
  username: string;
  userEmail: string;
  password: string;
  role?: string;
  isTeam?: boolean;
}

const UI_URL = process.env.UI_URL || 'http://localhost:3000';
const secret = process.env.JWT_SECRET || 'your_jwt_secret';
const emailSecret = process.env.EMAIL_SECRET || 'your_email_secret';
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const createAdmin = async (req: Request<{}, {}, AdminRequestBody>, res: Response): Promise<void> => {
  const { username, userEmail } = req.body;
  const adminRoleIdQuery = 'SELECT id FROM roles WHERE role = $1';
  const adminRoleIdResult = await pool.query(adminRoleIdQuery, ['ADMIN']);
  const adminRoleId = adminRoleIdResult.rows[0].id;

  try {
    const query = `
      INSERT INTO users (id, username, user_email, password, role_id, is_team)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const values = [uuidv4(), username, userEmail, adminRoleId, false];

    const result = await pool.query(query, values);
    const firtsPasswordRequest = await requestPasswordCreate(result.rows[0].id);
    if (!firtsPasswordRequest) {
      res.status(500).send('Some error has occurred during pasword creation request');
      return;
    }
    res.status(201).send({ message: 'New Admin created', adminId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Some error has occurred');
  }
};

export const requestPasswordCreate = async (userId: string): Promise<boolean> => {
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);
  const user = result.rows[0];

  if (!user) {
    return false;
  }

  const resetToken = jwt.sign({ id: user.id }, emailSecret, { expiresIn: '1h' });
  const resetLink = `${UI_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: 'kosicka.samostatna.liga@zohomail.eu',
    to: user.user_email,
    subject: `Vytvorenie Timu "${user.team_name}"`,
    text: `Kliknite na odkaz a nastavte si heslo: ${resetLink}`,
  };

  transporter.verify(function(error, success) {
    if (error) {
      console.log('Mail Server connection error:', error)
      return false
    }
  });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return false;
    }
  });
  return true;
};

export const requestPasswordReset: RequestHandler = async (req, res) => {
  const { email } = req.body;
  const query = 'SELECT * FROM users WHERE user_email = $1';
  const result = await pool.query(query, [email]);
  const user = result.rows[0];

  if (!user) {
    return res.status(404).send('User not found');
  }

  const resetToken = jwt.sign({ id: user.id }, emailSecret, { expiresIn: '1h' });
  const resetLink = `http://yourdomain.com/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: 'kosicka.samostatna.liga@zohomail.eu',
    to: email,
    subject: 'Password Reset',
    text: `Click the link to reset your password: ${resetLink}`,
  };

  transporter.verify(function(error, success) {
    if (error) {
          console.log('Connection error:', error)
    } else {
          console.log('Server is ready to take our messages');
    }
  });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).send('Error sending email');
    }
    res.send('Password reset email sent');
  });
};

export const resetPassword: RequestHandler = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, emailSecret);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = $1 WHERE id = $2';
    // @ts-ignore-next-line
    await pool.query(query, [hashedPassword, decoded.id]);
    res.send('Password reset successful');
  } catch (err) {
    res.status(400).send('Invalid or expired token');
  }
};

export const login = async (username: string, password: string) => {
  const query = 'SELECT users.*, roles.role FROM users left join roles on users.role_id = roles.id WHERE username = $1';
  const result = await pool.query(query, [username]);

  console.log('Query result:', result.rows);

  const user = result.rows[0];
  const hashedPassword = await bcrypt.hash(password, 10);

  if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: user.id, role: user.role_id, isTeam: user.is_team }, secret, { expiresIn: '1h' });
  return { token, id: user.id, userEmail: user.user_email, userRole: user.role, teamName: user.team_name, username: user.username };
};

export const authenticate: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).send('Access denied, login required');
  }

  try {
    const decoded = jwt.verify(token, secret);
    // @ts-ignore-next-line
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).send('Invalid token');
  }
};

export const authorizeAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).send('Access denied');
  }

  const query = `
    SELECT users.id as user_id
    FROM users
    JOIN roles
      ON users.id = $1
      AND users.role_id = roles.id
      AND roles.role = 'ADMIN'
  `
  const result = await pool.query(query, [user.id]);
  const userId = result.rows[0]?.user_id;

  if (!userId) {
    return res.status(403).send('Forbidden: Admins only');
  }

  next();
};
