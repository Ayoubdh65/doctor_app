import cors from "cors";
import express from "express";

import { assertRequiredConfig, config } from "./config.js";
import { initDb } from "./db.js";
import appointmentsRoutes from "./routes/appointments.js";
import authRoutes from "./routes/auth.js";
import patientsRoutes from "./routes/patients.js";
import reportsRoutes from "./routes/reports.js";

assertRequiredConfig();
initDb();

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    service: "doctor-interface-backend",
    status: "ok",
    supabaseUrl: config.supabaseUrl,
    supabasePatientsTable: config.supabasePatientsTable,
    supabaseVitalsTable: config.supabaseVitalsTable,
    supabaseAlertsTable: config.supabaseAlertsTable,
    supabaseAppointmentsTable: config.supabaseAppointmentsTable,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/reports", reportsRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: error.message || "Unexpected server error",
  });
});

app.listen(config.port, () => {
  console.log(`Doctor interface backend running on http://localhost:${config.port}`);
});
