import express from "express";
import bcrypt from "bcryptjs";

import { db, generateDoctorInviteCode } from "../db.js";
import { requireAuth, signDoctorToken } from "../middleware/auth.js";

const router = express.Router();

function sanitizeDoctor(row) {
  return {
    id: row.id,
    inviteCode: row.invite_code,
    username: row.username,
    fullName: row.full_name,
    specialization: row.specialization,
    createdAt: row.created_at,
  };
}

router.post("/register", async (req, res) => {
  const { username, password, fullName, specialization = "" } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: "username, password, and fullName are required" });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM doctors WHERE username = ?").get(normalizedUsername);

  if (existing) {
    return res.status(409).json({ error: "Doctor username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const inviteCode = generateDoctorInviteCode();
  const result = db
    .prepare(`
      INSERT INTO doctors (username, password, full_name, specialization, invite_code)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(normalizedUsername, hashedPassword, fullName.trim(), specialization.trim(), inviteCode);

  const doctor = db.prepare("SELECT * FROM doctors WHERE id = ?").get(result.lastInsertRowid);
  const token = signDoctorToken(doctor);

  return res.status(201).json({
    token,
    doctor: sanitizeDoctor(doctor),
  });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const doctor = db
    .prepare("SELECT * FROM doctors WHERE username = ?")
    .get(username.trim().toLowerCase());

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
