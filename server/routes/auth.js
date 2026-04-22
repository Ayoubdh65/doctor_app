import express from "express";
import bcrypt from "bcryptjs";

import { config } from "../config.js";
import { db, generateDoctorInviteCode } from "../db.js";
import { requireAuth, signDoctorToken } from "../middleware/auth.js";

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validateRegistrationInput({ email, password, fullName, specialization }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedFullName = String(fullName || "").trim();
  const normalizedSpecialization = String(specialization || "").trim();

  if (!normalizedEmail || !password || !normalizedFullName) {
    return { error: "email, password, and fullName are required" };
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { error: "Please provide a valid email address" };
  }

  if (password.length < 8 || password.length > 72) {
    return { error: "Password must be between 8 and 72 characters" };
  }

  if (normalizedFullName.length < 2 || normalizedFullName.length > 80) {
    return { error: "Full name must be between 2 and 80 characters" };
  }

  if (normalizedSpecialization.length > 80) {
    return { error: "Specialization cannot exceed 80 characters" };
  }

  return {
    value: {
      email: normalizedEmail,
      password,
      fullName: normalizedFullName,
      specialization: normalizedSpecialization,
    },
  };
}

function supabaseHeaders(prefer = "return=minimal") {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    Prefer: prefer,
  };
}

async function syncDoctorToSupabase(doctor) {
  const url = new URL(`${config.supabaseUrl}/rest/v1/${config.supabaseDoctorsTable}`);

  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders("return=minimal"),
    body: JSON.stringify({
      id: String(doctor.id),
      email: doctor.email,
      full_name: doctor.full_name,
      invite_code: doctor.invite_code,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to save doctor in Supabase table \"${config.supabaseDoctorsTable}\": ${details || response.statusText}`
    );
  }
}

function sanitizeDoctor(row) {
  return {
    id: row.id,
    inviteCode: row.invite_code,
    email: row.email,
    fullName: row.full_name,
    specialization: row.specialization,
    createdAt: row.created_at,
  };
}

router.post("/register", async (req, res) => {
  const validation = validateRegistrationInput(req.body || {});

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { email, password, fullName, specialization } = validation.value;

  const existing = db.prepare("SELECT id FROM doctors WHERE email = ?").get(email);

  if (existing) {
    return res.status(409).json({ error: "Doctor email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const inviteCode = generateDoctorInviteCode();
  const result = db
    .prepare(`
      INSERT INTO doctors (email, password, full_name, specialization, invite_code)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(email, hashedPassword, fullName, specialization, inviteCode);

  try {
    const doctor = db.prepare("SELECT * FROM doctors WHERE id = ?").get(result.lastInsertRowid);
    await syncDoctorToSupabase(doctor);

    const token = signDoctorToken(doctor);
    return res.status(201).json({
      token,
      doctor: sanitizeDoctor(doctor),
    });
  } catch (error) {
    db.prepare("DELETE FROM doctors WHERE id = ?").run(result.lastInsertRowid);
    const status = String(error.message || "").includes("duplicate key") ? 409 : 502;
    return res.status(status).json({
      error: error.message || "Could not register doctor",
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: "Please provide a valid email address" });
  }

  const doctor = db
    .prepare("SELECT * FROM doctors WHERE email = ?")
    .get(normalizedEmail);

  if (!doctor) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatches = await bcrypt.compare(password, doctor.password);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signDoctorToken(doctor);
  return res.json({
    token,
    doctor: sanitizeDoctor(doctor),
  });
});

router.get("/me", requireAuth, (req, res) => {
  const doctor = db.prepare("SELECT * FROM doctors WHERE id = ?").get(req.doctor.sub);

  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  return res.json({ doctor: sanitizeDoctor(doctor) });
});

export default router;
