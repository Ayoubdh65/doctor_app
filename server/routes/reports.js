import express from "express";

import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getAlerts,
  getAlertsStats,
  getLatestVitals,
  getPatientById,
  getVitalsStats,
} from "../services/centralApi.js";
import { generateMedicalReport } from "../services/ollama.js";

const router = express.Router();

router.use(requireAuth);

function mapReport(row) {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

function periodToHours(period) {
  const lookup = {
    "1h": 1,
    "6h": 6,
    "24h": 24,
    "7d": 168,
    "30d": 720,
  };

  return lookup[period] || 24;
}

function buildPrompt({ patient, latestVitals, vitalsStats, alerts, alertStats, period, doctor }) {
  return `
You are a clinical documentation assistant.
Generate a concise doctor-facing report in markdown.

Doctor:
- Name: ${doctor.fullName || doctor.username}
- Specialization: ${doctor.specialization || "General"}

Patient:
- ID: ${patient.id ?? patient.uuid ?? "unknown"}
- Name: ${[patient.first_name, patient.last_name].filter(Boolean).join(" ") || patient.name || "Unknown"}
- Blood type: ${patient.blood_type || patient.bloodType || "Unknown"}
- Period reviewed: ${period}

Latest vitals:
${JSON.stringify(latestVitals, null, 2)}

Vitals statistics:
${JSON.stringify(vitalsStats, null, 2)}

Alert statistics:
${JSON.stringify(alertStats, null, 2)}

Recent alerts:
${JSON.stringify(alerts, null, 2)}

Write the report with these sections:
1. Clinical summary
2. Vitals interpretation
3. Alert review
4. Suggested follow-up
5. Risks and caveats
  `.trim();
}

router.post("/generate", async (req, res, next) => {
  const { patientId, period = "24h" } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: "patientId is required" });
  }

  try {
    const hours = periodToHours(period);
    const [patient, latestVitals, vitalsStats, alerts, alertStats] = await Promise.all([
      getPatientById(patientId, req.doctor.sub),
      getLatestVitals(patientId),
      getVitalsStats(patientId, hours),
      getAlerts(patientId),
      getAlertsStats(patientId),
    ]);

    const prompt = buildPrompt({
      patient,
      latestVitals,
      vitalsStats,
      alerts,
      alertStats,
      period,
      doctor: req.doctor,
    });

    const content = await generateMedicalReport(prompt);
    const result = db
      .prepare(`
        INSERT INTO reports (doctor_id, patient_id, content)
        VALUES (?, ?, ?)
      `)
      .run(req.doctor.sub, String(patientId), content);

    const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(result.lastInsertRowid);
    return res.status(201).json(mapReport(report));
  } catch (error) {
    next(error);
  }
});

router.get("/", (req, res) => {
  const { patientId } = req.query;
  let sql = "SELECT * FROM reports WHERE doctor_id = ?";
  const values = [req.doctor.sub];

  if (patientId) {
    sql += " AND patient_id = ?";
    values.push(String(patientId));
  }

  sql += " ORDER BY created_at DESC";

  const reports = db.prepare(sql).all(...values).map(mapReport);
  res.json(reports);
});

router.get("/:id", (req, res) => {
  const report = db
    .prepare("SELECT * FROM reports WHERE id = ? AND doctor_id = ?")
    .get(req.params.id, req.doctor.sub);

  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  return res.json(mapReport(report));
});

export default router;
