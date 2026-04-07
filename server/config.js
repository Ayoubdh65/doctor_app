import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env") });

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

export const config = {
  rootDir,
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || "doctor-app-secret",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5174",
  supabaseUrl: trimTrailingSlash(process.env.SUPABASE_URL || ""),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabasePatientsTable: process.env.SUPABASE_PATIENTS_TABLE || "patients",
  supabaseVitalsTable: process.env.SUPABASE_VITALS_TABLE || "vital_readings",
  supabaseAlertsTable: process.env.SUPABASE_ALERTS_TABLE || "alerts",
  supabaseAppointmentsTable: process.env.SUPABASE_APPOINTMENTS_TABLE || "appointments",
  ollamaBaseUrl: trimTrailingSlash(process.env.OLLAMA_BASE_URL || "http://localhost:11434"),
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",
  dbPath: path.resolve(rootDir, process.env.DOCTOR_DB_PATH || "doctor-interface.db"),
};

export function assertRequiredConfig() {
  const missing = [];

  if (!config.supabaseUrl) {
    missing.push("SUPABASE_URL");
  }

  if (!config.supabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!config.jwtSecret) {
    missing.push("JWT_SECRET");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
