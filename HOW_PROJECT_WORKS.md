# How This Project Works

## 1. What this app is

Doctor Interface is a full-stack app used by doctors to:

- Sign up and sign in
- View assigned patients
- Inspect patient vitals and alerts
- Manage appointments
- Generate AI medical reports

The app is split into two runtime parts:

- Frontend React app served by Vite
- Backend Node.js + Express API

## 2. High-level architecture

Frontend:

- Renders the doctor dashboard UI
- Stores doctor session token and doctor profile in browser localStorage
- Calls backend endpoints through frontend/src/api.js

Backend:

- Validates doctor JWT tokens
- Reads patient data from Supabase tables
- Writes reports to local SQLite
- Creates and updates appointments in Supabase
- Calls Ollama to generate report content

Data sources:

- Supabase: patients, vitals, alerts, appointments
- SQLite: doctors, reports
- Ollama: markdown report generation model

## 3. Directory map

frontend/src:

- App.jsx: main shell and tab navigation
- api.js: all HTTP client calls and session helpers
- hooks/useDoctorData.js: dashboard state and loading orchestration
- components/: login, patients, details, appointments, reports UI

server:

- index.js: Express app bootstrap and route mounting
- config.js: environment variables and required config checks
- db.js: SQLite initialization and doctor invite-code utilities
- middleware/auth.js: JWT sign and verify middleware
- routes/: auth, patients, appointments, reports, public
- services/centralApi.js: Supabase read layer for clinical data
- services/ollama.js: Ollama report generation call

## 4. Runtime flow

### 4.1 Startup

1. Backend starts from server/index.js.
2. Backend loads .env values from server/config.js.
3. Backend checks required env keys.
4. Backend initializes SQLite tables if missing.
5. Frontend starts with Vite and proxies /api to backend.

### 4.2 Authentication

1. Doctor registers or logs in through frontend login form.
2. Backend route /api/auth/register or /api/auth/login validates credentials.
3. Backend returns JWT and doctor profile.
4. Frontend stores token and doctor in localStorage.
5. On refresh, frontend calls /api/auth/me to verify saved session.

### 4.3 Dashboard data loading

In useDoctorData.js:

1. Fetch patients from /api/patients.
2. For each patient, also fetch latest vitals and alert stats for list cards.
3. Auto-select first patient when available.
4. Load selected patient detail:
   - /api/patients/:id
   - /api/patients/:id/vitals/latest
   - /api/patients/:id/vitals/history
   - /api/patients/:id/vitals/stats
   - /api/patients/:id/alerts
   - /api/patients/:id/alerts/stats

### 4.4 Appointment flow

1. UI sends create/update/delete requests to /api/appointments endpoints.
2. Backend verifies doctor access to patient.
3. Backend validates slot overlap and date rules.
4. Backend writes appointment rows in Supabase appointments table.
5. Upcoming and full appointment lists are returned to frontend.

### 4.5 Report generation flow

1. UI sends patientId and period to /api/reports/generate.
2. Backend fetches patient context from Supabase (vitals + alerts + stats).
3. Backend builds a structured prompt.
4. Backend calls Ollama /api/generate.
5. Generated markdown is saved in SQLite reports table.
6. Frontend can list and open saved reports.

## 5. Route overview

Auth routes:

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

Public route:

- GET /api/public/doctors/lookup?code=... (doctor invite code lookup)

Patient routes:

- GET /api/patients
- GET /api/patients/:id
- GET /api/patients/:id/vitals/latest
- GET /api/patients/:id/vitals/history
- GET /api/patients/:id/vitals/stats
- GET /api/patients/:id/alerts
- GET /api/patients/:id/alerts/stats

Appointment routes:

- GET /api/appointments
- GET /api/appointments/upcoming
- POST /api/appointments
- PUT /api/appointments/:id
- POST /api/appointments/:id/cancel
- DELETE /api/appointments/:id

Report routes:

- POST /api/reports/generate
- GET /api/reports
- GET /api/reports/:id

## 6. Security model

- JWT tokens are signed with JWT_SECRET and expire in 12 hours.
- Protected routes require Authorization: Bearer <token>.
- Frontend clears local session on 401 responses.
- Backend checks patient ownership before returning patient data.
- Supabase access uses service-role key server-side only.

## 7. Environment variables

Important keys used by backend:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_PATIENTS_TABLE
- SUPABASE_VITALS_TABLE
- SUPABASE_ALERTS_TABLE
- SUPABASE_APPOINTMENTS_TABLE
- OLLAMA_BASE_URL
- OLLAMA_MODEL
- JWT_SECRET
- PORT
- CORS_ORIGIN
- DOCTOR_DB_PATH

## 8. Frontend styling and charts

- Styling uses Tailwind CSS utilities.
- Patient trend charts use Recharts in PatientDetail.

## 9. Typical local development commands

- npm install
- npm run dev
- npm run build
- npm start

## 10. Practical mental model

Think of the app as:

- A doctor-authenticated shell and workflow UI on the frontend
- A secure aggregation API on the backend
- Supabase as source of truth for patient telemetry and appointments
- SQLite as local persistence for doctor accounts and generated reports
- Ollama as the report text generator
