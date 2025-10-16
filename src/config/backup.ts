import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import 'dotenv/config';

const backupDir = process.env.BACKUP_DIR || os.tmpdir();

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Get a fresh Dropbox access token using the refresh token
 */
async function getDropboxAccessToken(): Promise<string> {
  const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
  const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
  const DROPBOX_REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;

  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET || !DROPBOX_REFRESH_TOKEN) {
    throw new Error('Missing Dropbox credentials in .env');
  }

  const response = await axios.post(
    'https://api.dropboxapi.com/oauth2/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: DROPBOX_REFRESH_TOKEN,
    }),
    {
      auth: {
        username: DROPBOX_APP_KEY,
        password: DROPBOX_APP_SECRET,
      },
    }
  );
  if (response.status !== 200) {
    throw new Error('❌ Failed to get Dropbox access token');
  }

  return response.data.access_token;
}

/**
 * Create PostgreSQL backup using pg_dump
 */
async function createBackupFile(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `db-backup-${timestamp}.backup`);

  console.log(`Starting PostgreSQL backup at ${timestamp}...`);

  const { DB_USER, DB_HOST, DB_NAME, DB_PASS } = process.env;
  if (!DB_USER || !DB_HOST || !DB_NAME || !DB_PASS) {
    throw new Error('Missing required database environment variables');
  }

  const dumpArgs = ['-U', DB_USER, '-h', DB_HOST, '-F', 'c', '-b', '-v', '-f', backupFile, DB_NAME];

  await new Promise<void>((resolve, reject) => {
    let stderr = '';
    const dumpProcess = spawn('pg_dump', dumpArgs, {
      env: { ...process.env, PGPASSWORD: DB_PASS },
    });

    dumpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    dumpProcess.on('error', (err) => {
      stderr += err.message;
      reject(err);
    });

    dumpProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Backup file created successfully!');
        resolve();
      } else {
        console.error('❌ pg_dump failed:', stderr);
        reject(new Error(`pg_dump exited with code ${code}`));
      }
    });
  });

  return backupFile;
}

/**
 * Upload backup file to Dropbox
 */
async function uploadToDropbox(filePath: string): Promise<void> {
  const accessToken = await getDropboxAccessToken();
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  await axios.post('https://content.dropboxapi.com/2/files/upload', fileContent, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({
        path: `/db_backups/${fileName}`,
        mode: 'add',
        autorename: true,
        mute: false,
      }),
      'Content-Type': 'application/octet-stream',
    },
  });

  console.log(`✅ Backup uploaded to Dropbox successfully: /db_backups/${fileName}`);
}

/**
 * Full backup workflow
 */
export async function createAndUploadBackup(): Promise<string> {
  const backupFile = await createBackupFile();

  try {
    await uploadToDropbox(backupFile);
  } finally {
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
      console.log('Local backup file deleted.');
    }
  }

  return 'Backup completed and uploaded successfully!';
}
