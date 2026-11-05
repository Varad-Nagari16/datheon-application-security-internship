import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { DEMO_PASSWORD, trainingRecords } from "./records.js";

export type AppDatabase = InstanceType<typeof Database>;

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program TEXT NOT NULL,
    term TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_applications_owner_id
    ON applications(owner_id);
`;

export function initializeDatabase(database: AppDatabase): AppDatabase {
  database.pragma("foreign_keys = ON");
  database.exec(schema);

  const findUser = database.prepare("SELECT id FROM users WHERE id = ?");
  const insertUser = database.prepare(`
    INSERT OR IGNORE INTO users (id, email, student_name, password_salt, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertApplication = database.prepare(`
    INSERT OR IGNORE INTO applications (id, owner_id, program, term, status, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seed = database.transaction(() => {
    for (const record of trainingRecords) {
      if (!findUser.get(record.ownerId)) {
        const salt = randomBytes(16).toString("hex");
        const passwordHash = scryptSync(DEMO_PASSWORD, salt, 64).toString("hex");
        insertUser.run(
          record.ownerId,
          record.email.toLowerCase(),
          record.studentName,
          salt,
          passwordHash,
        );
      }

      insertApplication.run(
        Number(record.id),
        record.ownerId,
        record.program,
        record.term,
        record.status,
        record.note,
      );
    }
  });

  seed();
  return database;
}

export function openDatabase(databasePath: string): AppDatabase {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  return initializeDatabase(new Database(databasePath));
}
