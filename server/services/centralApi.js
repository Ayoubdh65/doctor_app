import { config } from "../config.js";

function supabaseHeaders() {
  return {
    Accept: "application/json",
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
  };
}

function buildSupabaseUrl(table, params = {}) {
  const url = new URL(`${config.supabaseUrl}/rest/v1/${table}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function requestSupabase(table, params = {}) {
  const response = await fetch(buildSupabaseUrl(table, params), {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

function mapPatient(row) {
  return {
    id: row.patient_uuid,
    uuid: row.patient_uuid,
    patient_uuid: row.patient_uuid,
    doctor_id: row.doctor_id || null,
    doctorId: row.doctor_id || null,
    name: row.full_name,
    full_name: row.full_name,
    first_name: row.first_name,
    last_name: row.last_name,
    date_of_birth: row.date_of_birth,
    medical_id: row.medical_id,
    blood_type: row.blood_type,
    emergency_contact: row.emergency_contact,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapVitalReading(row) {
  return {
    id: row.uuid,
    uuid: row.uuid,
    patient_id: row.patient_uuid,
    patient_uuid: row.patient_uuid,
    timestamp: row.timestamp,
    heart_rate: row.heart_rate,
    spo2: row.spo2,
    temperature: row.temperature,
    blood_pressure_sys: row.blood_pressure_sys,
    blood_pressure_dia: row.blood_pressure_dia,
    respiratory_rate: row.respiratory_rate,
    ppg_raw: row.ppg_raw,
  };
}

function periodToDate(period) {
  const now = Date.now();
  const periods = {
    "1h": 1 * 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  return new Date(now - (periods[period] || periods["24h"])).toISOString();
}

function hoursToDate(hours) {
  return new Date(Date.now() - Number(hours || 24) * 60 * 60 * 1000).toISOString();
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function minimum(values) {
  return values.length ? Math.min(...values) : null;
}

function maximum(values) {
  return values.length ? Math.max(...values) : null;
}

function numeric(readings, field) {
  return readings
    .map((item) => item[field])
    .filter((value) => typeof value === "number" && Number.isFinite(value));
}

function mapAlert(row) {
  return {
    id: row.uuid,
    uuid: row.uuid,
    patient_id: row.patient_uuid,
    patient_uuid: row.patient_uuid,
    reading_id: row.reading_uuid,
    reading_uuid: row.reading_uuid,
    device_id: row.device_id,
    timestamp: row.timestamp,
    severity: row.severity,
    alert_type: row.alert_type,
    vital_name: row.vital_name,
    vital_value: row.vital_value,
    threshold: row.threshold,
    message: row.message,
    acknowledged: Boolean(row.acknowledged),
    acknowledged_at: row.acknowledged_at,
    acknowledged_by: row.acknowledged_by,
  };
}

async function getRecentVitalReadings(patientId, fromIso, limit = 500) {
  const rows = await requestSupabase(config.supabaseVitalsTable, {
    select:
      "uuid,patient_uuid,timestamp,heart_rate,spo2,temperature,blood_pressure_sys,blood_pressure_dia,respiratory_rate,ppg_raw",
    patient_uuid: `eq.${patientId}`,
    timestamp: `gte.${fromIso}`,
    order: "timestamp.desc",
    limit,
  });

  return rows.map(mapVitalReading);
}

export async function getPatients(doctorId) {
  const rows = await requestSupabase(config.supabasePatientsTable, {
    select:
      "patient_uuid,doctor_id,full_name,first_name,last_name,date_of_birth,medical_id,blood_type,emergency_contact,notes,created_at,updated_at",
    ...(doctorId ? { doctor_id: `eq.${doctorId}` } : {}),
    order: "updated_at.desc",
  });

  return rows.map(mapPatient);
}

export async function getPatientById(id, doctorId) {
  const rows = await requestSupabase(config.supabasePatientsTable, {
    select:
      "patient_uuid,doctor_id,full_name,first_name,last_name,date_of_birth,medical_id,blood_type,emergency_contact,notes,created_at,updated_at",
    patient_uuid: `eq.${id}`,
    ...(doctorId ? { doctor_id: `eq.${doctorId}` } : {}),
    limit: 1,
  });

  if (rows.length === 0) {
    throw new Error(`Patient ${id} not found in Supabase`);
  }

  return mapPatient(rows[0]);
}

export async function getLatestVitals(patientId) {
  const rows = await requestSupabase(config.supabaseVitalsTable, {
    select:
      "uuid,patient_uuid,timestamp,heart_rate,spo2,temperature,blood_pressure_sys,blood_pressure_dia,respiratory_rate,ppg_raw",
    patient_uuid: `eq.${patientId}`,
    order: "timestamp.desc",
    limit: 1,
  });

  return rows.length > 0 ? mapVitalReading(rows[0]) : null;
}

export async function getVitalsHistory(patientId, period) {
  const rows = await getRecentVitalReadings(patientId, periodToDate(period), 500);
  const points = [...rows].reverse();

  return {
    points,
    period: period || "24h",
    granularity: "raw",
    total_readings: points.length,
  };
}

export async function getVitalsStats(patientId, hours) {
  const fromIso = hoursToDate(hours);
  const readings = await getRecentVitalReadings(patientId, fromIso, 1000);

  const heartRate = numeric(readings, "heart_rate");
  const spo2 = numeric(readings, "spo2");
  const temperature = numeric(readings, "temperature");
  const bloodPressureSys = numeric(readings, "blood_pressure_sys");
  const bloodPressureDia = numeric(readings, "blood_pressure_dia");
  const respiratoryRate = numeric(readings, "respiratory_rate");

  return {
    period_start: fromIso,
    period_end: new Date().toISOString(),
    total_readings: readings.length,
    heart_rate_avg: average(heartRate),
    heart_rate_min: minimum(heartRate),
    heart_rate_max: maximum(heartRate),
    spo2_avg: average(spo2),
    spo2_min: minimum(spo2),
    spo2_max: maximum(spo2),
    temperature_avg: average(temperature),
    blood_pressure_sys_avg: average(bloodPressureSys),
    blood_pressure_dia_avg: average(bloodPressureDia),
    respiratory_rate_avg: average(respiratoryRate),
  };
}

export async function getAlerts(patientId) {
  const rows = await requestSupabase(config.supabaseAlertsTable, {
    select:
      "uuid,patient_uuid,reading_uuid,device_id,timestamp,severity,alert_type,vital_name,vital_value,threshold,message,acknowledged,acknowledged_at,acknowledged_by",
    patient_uuid: `eq.${patientId}`,
    order: "timestamp.desc",
    limit: 100,
  });

  return rows.map(mapAlert);
}

export async function getAlertsStats(patientId) {
  const alerts = await getAlerts(patientId);
  const critical = alerts.filter((alert) => alert.severity === "critical").length;
  const warning = alerts.filter((alert) => alert.severity === "warning").length;
  const unacknowledged = alerts.filter((alert) => !alert.acknowledged).length;
  const acknowledged = alerts.length - unacknowledged;

  return {
    total: alerts.length,
    total_alerts: alerts.length,
    critical,
    critical_alerts: critical,
    warning,
    warning_alerts: warning,
    activeAlerts: unacknowledged,
    active_alerts: unacknowledged,
    criticalAlerts: critical,
    acknowledged,
    unacknowledged,
  };
}
