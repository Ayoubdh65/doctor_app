import crypto from "crypto";
import express from "express";

import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { getPatientById } from "../services/centralApi.js";

const router = express.Router();

router.use(requireAuth);

function supabaseHeaders(prefer = "return=representation") {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    Prefer: prefer,
  };
}

function buildSupabaseUrl(params = {}) {
  const url = new URL(`${config.supabaseUrl}/rest/v1/${config.supabaseAppointmentsTable}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function requestSupabase(method, params = {}, body, prefer = "return=representation") {
  const response = await fetch(buildSupabaseUrl(params), {
    method,
    headers: supabaseHeaders(prefer),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase ${response.status}: ${errorText || response.statusText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function mapAppointment(row) {
  return {
    id: row.uuid || row.id,
    uuid: row.uuid || row.id,
    doctorId: row.doctor_id,
    patientId: row.patient_uuid || row.patient_id,
    patientUuid: row.patient_uuid || row.patient_id,
    title: row.title || "Medical Appointment",
    location: row.location || "",
    scheduledAt: row.scheduled_for || row.scheduled_at,
    duration: row.duration ?? 30,
    status: row.status || "scheduled",
    notes: row.notes || "",
    createdBy: row.created_by || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: row.read_at || null,
  };
}

function sortAppointments(items) {
  return [...items].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

async function getDoctorAppointments(doctorId, filters = {}) {
  const rows = await requestSupabase("GET", {
    select:
      "uuid,doctor_id,patient_uuid,title,location,scheduled_for,duration,status,notes,created_by,created_at,updated_at,read_at",
    doctor_id: `eq.${doctorId}`,
    ...(filters.patientId ? { patient_uuid: `eq.${filters.patientId}` } : {}),
    ...(filters.status ? { status: `eq.${filters.status}` } : {}),
    limit: 200,
  });

  return sortAppointments(rows.map(mapAppointment));
}

async function getAppointmentOrNull(appointmentId, doctorId) {
  const rows = await requestSupabase("GET", {
    select:
      "uuid,doctor_id,patient_uuid,title,location,scheduled_for,duration,status,notes,created_by,created_at,updated_at,read_at",
    uuid: `eq.${appointmentId}`,
    doctor_id: `eq.${doctorId}`,
    limit: 1,
  });

  return rows.length > 0 ? mapAppointment(rows[0]) : null;
}

async function doctorHasPatient(patientId, doctorId) {
  try {
    await getPatientById(patientId, doctorId);
    return true;
  } catch {
    return false;
  }
}

router.get("/", async (req, res, next) => {
  try {
    const appointments = await getDoctorAppointments(req.doctor.sub, {
      patientId: req.query.patientId,
      status: req.query.status,
    });
    res.json(appointments);
  } catch (error) {
    next(error);
  }
});

router.get("/upcoming", async (req, res, next) => {
  try {
    const now = Date.now();
    const appointments = await getDoctorAppointments(req.doctor.sub);
    const upcoming = appointments.filter(
      (appointment) =>
        new Date(appointment.scheduledAt).getTime() >= now && appointment.status !== "cancelled"
    );
    res.json(upcoming);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const {
    patientId,
    title = "Medical Appointment",
    location = "",
    scheduledAt,
    duration,
    status = "scheduled",
    notes = "",
  } = req.body;

  if (!patientId || !scheduledAt || !duration || !title) {
    return res.status(400).json({
      error: "patientId, title, scheduledAt, and duration are required",
    });
  }

  const now = new Date().toISOString();
  const payload = {
    uuid: crypto.randomUUID(),
    doctor_id: String(req.doctor.sub),
    patient_uuid: String(patientId),
    title: String(title).trim(),
    location: String(location || "").trim(),
    scheduled_for: new Date(scheduledAt).toISOString(),
    duration: Number(duration),
    status: String(status),
    notes: String(notes || "").trim(),
    created_by: req.doctor.fullName || req.doctor.username,
    created_at: now,
    updated_at: now,
    read_at: null,
  };

  try {
    const allowedPatient = await doctorHasPatient(String(patientId), req.doctor.sub);

    if (!allowedPatient) {
      return res.status(404).json({ error: "Patient not found for this doctor" });
    }

    const createdRows = await requestSupabase("POST", {}, payload);
    res.status(201).json(mapAppointment(createdRows[0]));
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const existing = await getAppointmentOrNull(req.params.id, req.doctor.sub);

    if (!existing) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const targetPatientId = String(req.body.patientId || existing.patientId);
    const allowedPatient = await doctorHasPatient(targetPatientId, req.doctor.sub);

    if (!allowedPatient) {
      return res.status(404).json({ error: "Patient not found for this doctor" });
    }

    const payload = {
      patient_uuid: targetPatientId,
      title: String(req.body.title || existing.title).trim(),
      location: String(req.body.location ?? existing.location ?? "").trim(),
      scheduled_for: req.body.scheduledAt
        ? new Date(req.body.scheduledAt).toISOString()
        : existing.scheduledAt,
      duration: Number(req.body.duration || existing.duration),
      status: String(req.body.status || existing.status),
      notes: String(req.body.notes ?? existing.notes ?? "").trim(),
      updated_at: new Date().toISOString(),
    };

    const updatedRows = await requestSupabase(
      "PATCH",
      {
        uuid: `eq.${req.params.id}`,
        doctor_id: `eq.${req.doctor.sub}`,
        select:
          "uuid,doctor_id,patient_uuid,title,location,scheduled_for,duration,status,notes,created_by,created_at,updated_at,read_at",
      },
      payload
    );

    if (!updatedRows || updatedRows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    return res.json(mapAppointment(updatedRows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await getAppointmentOrNull(req.params.id, req.doctor.sub);

    if (!existing) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    await requestSupabase(
      "DELETE",
      {
        uuid: `eq.${req.params.id}`,
        doctor_id: `eq.${req.doctor.sub}`,
      },
      undefined,
      "return=minimal"
    );

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
