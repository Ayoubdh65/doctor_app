import express from "express";

import { requireAuth } from "../middleware/auth.js";
import {
  getAlerts,
  getAlertsStats,
  getLatestVitals,
  getPatientById,
  getPatients,
  getVitalsHistory,
  getVitalsStats,
} from "../services/centralApi.js";

const router = express.Router();

router.use(requireAuth);

async function ensureDoctorPatientAccess(patientId, doctorId) {
  try {
    return await getPatientById(patientId, doctorId);
  } catch {
    return null;
  }
}

router.get("/", async (req, res, next) => {
  try {
    const patients = await getPatients(req.doctor.sub);
    res.json(patients);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const patient = await ensureDoctorPatientAccess(req.params.id, req.doctor.sub);

    if (!patient) {
      return res.status(404).json({ error: "Patient not found for this doctor" });
    }

    res.json(patient);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/vitals/latest", async (req, res, next) => {
  try {
    const patient = await ensureDoctorPatientAccess(req.params.id, req.doctor.sub);

    if (!patient) {
      return res.status(404).json({ error: "Patient not found for this doctor" });
    }

    const latestVitals = await getLatestVitals(req.params.id);
    res.json(latestVitals);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/vitals/history", async (req, res, next) => {
  try {
    const patient = await ensureDoctorPatientAccess(req.params.id, req.doctor.sub);

    if (!patient) {
      return res.status(404).json({ error: "Patient not found for this doctor" });
    }

    const history = await getVitalsHistory(req.params.id, req.query.period || "24h");
    res.json(history);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/vitals/stats", async (req, res, next) => {
  try {
    const patient = await ensureDoctorPatientAccess(req.params.id, req.doctor.sub);

    if (!patient) {
      return res.status(404).json({ error: "Patient not found for this doctor" });
    }

    const stats = await getVitalsStats(req.params.id, req.query.hours || 24);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/alerts", async (req, res, next) => {
  try {
    const patient = await ensureDoctorPatientAccess(req.params.id, req.doctor.sub);

    if (!patient) {
      return res.status(404).json({ error: "Patient not found for this doctor" });
    }

    const alerts = await getAlerts(req.params.id);
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/alerts/stats", async (req, res, next) => {
  try {
    const patient = await ensureDoctorPatientAccess(req.params.id, req.doctor.sub);

    if (!patient) {
      return res.status(404).json({ error: "Patient not found for this doctor" });
    }

    const stats = await getAlertsStats(req.params.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
