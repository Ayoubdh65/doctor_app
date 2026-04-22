import Database from "better-sqlite3";
import crypto from "crypto";

import { config } from "./config.js";

export const db = new Database(config.dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function buildInviteCode() {
  return `HG-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function generateDoctorInviteCode() {
  let inviteCode = buildInviteCode();

  while (db.prepare("SELECT id FROM doctors WHERE invite_code = ?").get(inviteCode)) {
    inviteCode = buildInviteCode();
  }

  return inviteCode;
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      specialization TEXT,
      invite_code TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      patient_id TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      duration INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      patient_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );
  `);

  const doctorColumns = db.prepare("PRAGMA table_info(doctors)").all();
  const hasEmail = doctorColumns.some((column) => column.name === "email");
  const hasUsername = doctorColumns.some((column) => column.name === "username");
  const hasInviteCode = doctorColumns.some((column) => column.name === "invite_code");

  if (!hasEmail) {
    db.exec("ALTER TABLE doctors ADD COLUMN email TEXT");
  }

  if (hasUsername) {
    db.exec(`
      UPDATE doctors
      SET email = LOWER(TRIM(username))
      WHERE (email IS NULL OR TRIM(email) = '')
        AND username IS NOT NULL
        AND TRIM(username) <> ''
    `);
  }

  if (!hasInviteCode) {
    db.exec("ALTER TABLE doctors ADD COLUMN invite_code TEXT");
  }

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email)");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_invite_code ON doctors(invite_code)");

  const doctorsMissingCode = db
    .prepare("SELECT id FROM doctors WHERE invite_code IS NULL OR TRIM(invite_code) = ''")
    .all();

  if (doctorsMissingCode.length > 0) {
    const updateInviteCode = db.prepare("UPDATE doctors SET invite_code = ? WHERE id = ?");
    const transaction = db.transaction((rows) => {
      rows.forEach((doctor) => {
        updateInviteCode.run(generateDoctorInviteCode(), doctor.id);
      });
    });

    transaction(doctorsMissingCode);
  }
}
