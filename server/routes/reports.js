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

function patientName(patient) {
  return [patient.first_name, patient.last_name].filter(Boolean).join(" ") || patient.name || "Unknown";
}

function formatValue(value, suffix = "") {
  if (value === undefined || value === null || value === "") {
    return "not available";
  }

  if (typeof value === "number") {
    return `${Number(value.toFixed(1))}${suffix}`;
  }

  return `${value}${suffix}`;
}

function compactLatestVitals(vitals) {
  if (!vitals) {
    return ["No latest vitals reading is available."];
  }

  return [
    `Timestamp: ${formatValue(vitals.timestamp)}`,
    `Heart rate: ${formatValue(vitals.heart_rate, " bpm")}`,
    `SpO2: ${formatValue(vitals.spo2, "%")}`,
    `Temperature: ${formatValue(vitals.temperature, " C")}`,
    `Blood pressure: ${formatValue(vitals.blood_pressure_sys)}/${formatValue(vitals.blood_pressure_dia)} mmHg`,
    `Respiratory rate: ${formatValue(vitals.respiratory_rate, " rpm")}`,
  ];
}

function compactVitalsStats(stats) {
  if (!stats) {
    return ["No vitals statistics are available."];
  }

  return [
    `Total readings: ${formatValue(stats.total_readings)}`,
    `Heart rate average/min/max: ${formatValue(stats.heart_rate_avg, " bpm")} / ${formatValue(stats.heart_rate_min, " bpm")} / ${formatValue(stats.heart_rate_max, " bpm")}`,
    `SpO2 average/min/max: ${formatValue(stats.spo2_avg, "%")} / ${formatValue(stats.spo2_min, "%")} / ${formatValue(stats.spo2_max, "%")}`,
    `Temperature average: ${formatValue(stats.temperature_avg, " C")}`,
    `Blood pressure average: ${formatValue(stats.blood_pressure_sys_avg)}/${formatValue(stats.blood_pressure_dia_avg)} mmHg`,
    `Respiratory rate average: ${formatValue(stats.respiratory_rate_avg, " rpm")}`,
  ];
}

function compactAlertStats(stats) {
  if (!stats) {
    return ["No alert statistics are available."];
  }

  return [
    `Total alerts: ${formatValue(stats.total_alerts ?? stats.total)}`,
    `Critical alerts: ${formatValue(stats.critical_alerts ?? stats.critical)}`,
    `Warning alerts: ${formatValue(stats.warning_alerts ?? stats.warning)}`,
    `Unacknowledged alerts: ${formatValue(stats.unacknowledged ?? stats.active_alerts ?? stats.activeAlerts)}`,
  ];
}

function compactRecentAlerts(alerts) {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return ["No recent alerts are available."];
  }

  return alerts.slice(0, 8).map((alert) =>
    [
      formatValue(alert.timestamp),
      formatValue(alert.severity),
      formatValue(alert.alert_type || alert.vital_name),
      formatValue(alert.message),
    ].join(" | ")
  );
}

function bulletList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function buildPrompt({ patient, latestVitals, vitalsStats, alerts, alertStats, period, doctor }) {
  return `
You are a clinical documentation assistant for a remote patient monitoring dashboard.
Write a concise doctor-facing markdown note using ONLY the facts in the DATA section.

Hard rules:
- Do not add facts that are not in DATA.
- Do not mention hospital admission, clinic visit, symptoms, treatment, physical exam, device uptime, routine checks, equipment maintenance, or equipment adjustments.
- Do not diagnose the patient.
- Do not say anything is certain. Use cautious wording like "available readings", "may warrant review", and "based on the provided monitoring data".
- If a section has no useful data, write "No clear conclusion from the provided data."
- Keep the report short: 1 to 3 bullets per section.
- Return ONLY the report. Do not explain your process.

Required output:
## Remote monitoring summary
- ...

## Vitals review
- ...

## Alert review
- ...

## Points for clinician follow-up
- ...

## Limitations and caveats
- ...

DATA
Doctor:
- Name: ${doctor.fullName || doctor.email}
- Specialization: ${doctor.specialization || "General"}

Patient:
- ID: ${patient.id ?? patient.uuid ?? "unknown"}
- Name: ${patientName(patient)}
- Blood type: ${patient.blood_type || patient.bloodType || "Unknown"}
- Period reviewed: ${period}

Latest vitals:
${bulletList(compactLatestVitals(latestVitals))}

Vitals statistics:
${bulletList(compactVitalsStats(vitalsStats))}

Alert statistics:
${bulletList(compactAlertStats(alertStats))}

Recent alerts:
${bulletList(compactRecentAlerts(alerts))}
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
