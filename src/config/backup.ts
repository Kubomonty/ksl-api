import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Dropbox } from 'dropbox';
import 'dotenv/config';

export async function createAndUploadBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  // Allow overriding the backup directory via env for flexibility
  const backupDir = process.env.BACKUP_DIR || os.tmpdir();

  // Ensure directory exists (creates recursively if needed)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `db-backup-${timestamp}.backup`);

  console.log(`Starting PostgreSQL backup at ${timestamp}...`);

  const { DB_USER, DB_HOST, DB_NAME, DB_PASS, DROPBOX_ACCESS_TOKEN } =
    process.env;

  if (
    !DB_USER ||
    !DB_HOST ||
    !DB_NAME ||
    !DB_PASS ||
    !DROPBOX_ACCESS_TOKEN
  ) {
    throw new Error('❌ Missing required environment variables.');
  }

  const dumpArgs = [
    '-U',
    DB_USER,
    '-h',
    DB_HOST,
    '-F',
    'c',
    '-b',
    '-v',
    '-f',
    backupFile,
    DB_NAME
  ];

  // Run pg_dump safely
  await new Promise<void>((resolve, reject) => {
    const dumpProcess = spawn('pg_dump', dumpArgs, {
      env: { ...process.env, PGPASSWORD: DB_PASS }
    });

    // Fail fast if spawn itself errors (command not found, permission issues, etc.)
    let stderr = '';
    dumpProcess.on('error', (err: Error) => {
      stderr += err.message;
      reject(err);
    });


    dumpProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    dumpProcess.on('close', (code: number | null) => {
      if (code === 0) {
        console.log('✅ Backup file created successfully!');
        resolve();
      } else {
        console.error('❌ pg_dump failed:', stderr);
        reject(new Error(`❌ pg_dump exited with code ${code}`));
      }
    });
  });

  // Upload to Dropbox
  try {
    const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN });
    const fileContent = fs.readFileSync(backupFile); // small file -> fine for sync read

    await dbx.filesUpload({
      path: `/db_backups/${path.basename(backupFile)}`,
      contents: fileContent,
      mode: { '.tag': 'add' },
      autorename: true
    });

    console.log('✅ Backup uploaded to Dropbox successfully!');
  } catch (err: any) {
    console.error('❌ Dropbox upload failed:', err.message);
    throw err;
  } finally {
    // Always clean up
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
      console.log('Local backup file deleted.');
    }
  }

  return 'Backup completed and uploaded successfully!';
}
