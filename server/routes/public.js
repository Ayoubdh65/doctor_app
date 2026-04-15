import express from "express";

import { db } from "../db.js";

const router = express.Router();

router.get("/doctors/lookup", (req, res) => {
  const code = String(req.query.code || "").trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ error: "Doctor code is required" });
  }

  const doctor = db
    .prepare(
      "SELECT id, full_name, specialization, invite_code FROM doctors WHERE invite_code = ?"
    )
    .get(code);

  if (!doctor) {
    return res.status(404).json({ error: "Doctor code not found" });
  }

  return res.json({
    valid: true,
    doctor: {
      id: doctor.id,
      fullName: doctor.full_name,
      specialization: doctor.specialization,
      inviteCode: doctor.invite_code,
    },
  });
});

export default router;
