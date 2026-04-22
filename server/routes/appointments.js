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

function normalizeScheduledStatus() {
  return "scheduled";
}

function sortAppointments(items) {
  return [...items].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

function isValidDate(value) {
  return !Number.isNaN(new Date(value).getTime());
}

function sameUtcDay(left, right) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

function appointmentsOverlap(startA, durationA, startB, durationB) {
  const endA = startA.getTime() + durationA * 60 * 1000;
  const endB = startB.getTime() + durationB * 60 * 1000;
  return startA.getTime() < endB && startB.getTime() < endA;
}

async function validateAppointmentSlot({
  doctorId,
  scheduledAt,
  duration,
  excludeAppointmentId = null,
}) {
  if (!isValidDate(scheduledAt)) {
    return "Please choose a valid appointment date and time";
  }

  const scheduledDate = new Date(scheduledAt);
  const now = new Date();

  if (scheduledDate.getTime() < now.getTime()) {
    return "Appointment time cannot be before the current date and time";
  }

  if (!Number.isFinite(duration) || duration < 5) {
    return "Appointment duration must be at least 5 minutes";
  }

  const doctorAppointments = await getDoctorAppointments(doctorId);
  const conflictingAppointment = doctorAppointments.find((appointment) => {
    if (excludeAppointmentId && String(appointment.id) === String(excludeAppointmentId)) {
      return false;
    }

    const existingStart = new Date(appointment.scheduledAt);
    const existingDuration = Number(appointment.duration) || 30;

    return (
      sameUtcDay(existingStart, scheduledDate) &&
      appointmentsOverlap(existingStart, existingDuration, scheduledDate, duration)
    );
  });

  if (conflictingAppointment) {
    return "This appointment overlaps another appointment on the same day. Please choose a different time";
  }

  return null;
}

async function getDoctorAppointments(doctorId, filters = {}) {
  const statusFilter =
    filters.includeCancelled || filters.status
      ? filters.status
      : "scheduled";
  const rows = await requestSupabase("GET", {
    select:
      "uuid,doctor_id,patient_uuid,title,location,scheduled_for,duration,status,notes,created_by,created_at,updated_at,read_at",
    doctor_id: `eq.${doctorId}`,
    ...(filters.patientId ? { patient_uuid: `eq.${filters.patientId}` } : {}),
    ...(statusFilter ? { status: `eq.${statusFilter}` } : {}),
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

async function cancelAppointmentRecord(appointmentId, doctorId) {
  const existing = await getAppointmentOrNull(appointmentId, doctorId);

  if (!existing) {
    return null;
  }

  const cancelledRows = await requestSupabase(
    "PATCH",
    {
      uuid: `eq.${appointmentId}`,
      doctor_id: `eq.${doctorId}`,
      select:
        "uuid,doctor_id,patient_uuid,title,location,scheduled_for,duration,status,notes,created_by,created_at,updated_at,read_at",
    },
    {
      status: "cancelled",
      read_at: null,
      updated_at: new Date().toISOString(),
    }
  );

  if (!cancelledRows || cancelledRows.length === 0) {
    return null;
  }

  return mapAppointment(cancelledRows[0]);
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
      (appointment) => new Date(appointment.scheduledAt).getTime() >= now
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
    notes = "",
  } = req.body;

  if (!patientId || !scheduledAt || !duration || !title) {
    return res.status(400).json({
      error: "patientId, title, scheduledAt, and duration are required",
    });
  }

  const now = new Date().toISOString();
  const normalizedDuration = Number(duration);

  try {
    const allowedPatient = await doctorHasPatient(String(patientId), req.doctor.sub);

    if (!allowedPatient) {
      return res.status(404).json({ error: "Patient not found for this doctor" });
    }

    const slotError = await validateAppointmentSlot({
      doctorId: req.doctor.sub,
      scheduledAt,
      duration: normalizedDuration,
    });

    if (slotError) {
      return res.status(400).json({ error: slotError });
    }

    const payload = {
      uuid: crypto.randomUUID(),
      doctor_id: String(req.doctor.sub),
      patient_uuid: String(patientId),
      title: String(title).trim(),
      location: String(location || "").trim(),
      scheduled_for: new Date(scheduledAt).toISOString(),
      duration: normalizedDuration,
      status: normalizeScheduledStatus(),
      notes: String(notes || "").trim(),
      created_by: req.doctor.fullName || req.doctor.email,
      created_at: now,
      updated_at: now,
      read_at: null,
    };

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
      title: String(req.body.title || existing.title).trim(),
      location: String(req.body.location ?? existing.location ?? "").trim(),
      notes: String(req.body.notes ?? existing.notes ?? "").trim(),
    };
    const nextScheduledAt = req.body.scheduledAt
      ? new Date(req.body.scheduledAt).toISOString()
      : existing.scheduledAt;
    const nextDuration = Number(req.body.duration || existing.duration);

    const slotError = await validateAppointmentSlot({
      doctorId: req.doctor.sub,
      scheduledAt: nextScheduledAt,
      duration: nextDuration,
      excludeAppointmentId: req.params.id,
    });

    if (slotError) {
      return res.status(400).json({ error: slotError });
    }

    Object.assign(payload, {
      patient_uuid: targetPatientId,
      scheduled_for: nextScheduledAt,
      duration: nextDuration,
      status: normalizeScheduledStatus(),
      updated_at: new Date().toISOString(),
    });

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

router.post("/:id/cancel", async (req, res, next) => {
  try {
    const cancelledAppointment = await cancelAppointmentRecord(req.params.id, req.doctor.sub);

    if (!cancelledAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    return res.json(cancelledAppointment);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const cancelledAppointment = await cancelAppointmentRecord(req.params.id, req.doctor.sub);

    if (!cancelledAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    return res.json(cancelledAppointment);
  } catch (error) {
    next(error);
  }
});

export default router;
