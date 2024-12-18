import { Request, RequestHandler, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

interface AdminRequestBody {
  username: string;
  email: string;
  role?: string;
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
  const { username, email } = req.body;
  console.log(`Create new admin attempt for ${username} at ${new Date().toISOString()}`);
  const adminRoleIdQuery = 'SELECT id FROM roles WHERE role = $1';
  const adminRoleIdResult = await pool.query(adminRoleIdQuery, ['ADMIN']);
  const adminRoleId = adminRoleIdResult.rows[0].id;

  try {
    const query = `
      INSERT INTO users (id, username, user_email, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const values = [uuidv4(), username.toLocaleLowerCase(), email.toLowerCase(), adminRoleId];

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
      console.error('Mail Server connection error:', error)
      return false
    }
  });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return false;
    }
  });
  return true;
};

export const requestPasswordReset: RequestHandler = async (req, res) => {
  const { email, username } = req.body;
  const query = 'SELECT * FROM users WHERE user_email = $1 AND username = $2 AND archived_at IS NULL';
  const result = await pool.query(query, [email.toLowerCase(), username.toLocaleLowerCase()]);
  const user = result.rows[0];

  if (!user) {
    return res.status(404).send('User not found');
  }

  const resetToken = jwt.sign({ id: user.id }, emailSecret, { expiresIn: '1h' });
  const resetLink = `${UI_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: 'kosicka.samostatna.liga@zohomail.eu',
    to: email,
    subject: `Obnovenie hesla - ${username}`,
    text: `Kliknite na odkaz a obnovte si heslo: ${resetLink}`,
  };

  transporter.verify(function(error, success) {
    if (error) {
          console.error('Connection error:', error)
    } else {
          console.log('Server is ready to take our messages');
    }
  });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
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

export const changePasswordReq: RequestHandler = async (req, res) => {
  const { oldPassword, newPassword, userId } = req.body;
  console.log(`Change password for user ${userId} at ${new Date().toISOString()}`);

  const userQuery = 'SELECT * FROM users WHERE id = $1 AND archived_at IS NULL';
  const userQueryResult = await pool.query(userQuery, [userId]);
  const user = userQueryResult.rows[0];
  const hashedOldPassword = await bcrypt.hash(oldPassword, 10);
  if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
    return res.status(400).send('Invalid credentials');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  const query = 'UPDATE users SET password = $1 WHERE id = $2';
  const result = await pool.query(query, [hashedNewPassword, userId]);
  if (!result) {
    return res.status(500).send('Some error has occurred');
  }
  res.send('Password changed successfully');
};

export const login = async (username: string, password: string) => {
  const query = 'SELECT users.*, roles.role FROM users left join roles on users.role_id = roles.id WHERE username = $1 AND archived_at IS NULL';
  const result = await pool.query(query, [username.toLocaleLowerCase()]);

  const user = result.rows[0];
  const hashedPassword = await bcrypt.hash(password, 10);

  if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: user.id, role: user.role_id }, secret, { expiresIn: '1h' });
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
    WHERE users.archived_at IS NULL
  `
  const result = await pool.query(query, [user.id]);
  const userId = result.rows[0]?.user_id;

  if (!userId) {
    return res.status(403).send('Forbidden: Admins only');
  }

  next();
};
