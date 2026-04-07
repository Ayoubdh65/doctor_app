# Doctor Interface

Standalone doctor-facing HealthGuard app.

This app is separate from the patient app and reads patient data from the shared Supabase database through the doctor backend.

## Folder

`C:\Users\Ayoub\OneDrive\Desktop\doctor-interface`

## Tech Stack

- Backend: Node.js + Express
- Frontend: React + Vite
- Local doctor DB: SQLite
- AI reports: Ollama

## What This App Stores Locally

- Doctors
- Appointments
- Generated reports

## What This App Does Not Store Locally

- Patient vitals
- Patient alerts
- Patient medical history

Those must come from the centralized HealthGuard backend.

## Required Environment

Edit `.env` and set real values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_PATIENTS_TABLE=patients
SUPABASE_VITALS_TABLE=vital_readings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
JWT_SECRET=replace-with-a-strong-secret
PORT=3001
CORS_ORIGIN=http://localhost:5174
DOCTOR_DB_PATH=doctor-interface.db
```

## Install

Run in `C:\Users\Ayoub\OneDrive\Desktop\doctor-interface`:

```bash
npm install
```

## Development

Run backend and frontend together:

```bash
npm run dev
```

Development URLs:

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:3001`

## Production Build

Build the frontend:

```bash
npm run build
```

Start the backend:

```bash
npm start
```

## Important Integration Note

The doctor app backend reads patient records and vitals from Supabase.

It does not depend on the patient app localhost API for doctor data.

## Main Routes

### Doctor backend

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/patients`
- `GET /api/patients/:id`
- `GET /api/patients/:id/vitals/latest`
- `GET /api/patients/:id/vitals/history`
- `GET /api/patients/:id/vitals/stats`
- `GET /api/patients/:id/alerts`
- `GET /api/patients/:id/alerts/stats`
- `GET /api/appointments`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `DELETE /api/appointments/:id`
- `GET /api/appointments/upcoming`
- `POST /api/reports/generate`
- `GET /api/reports`
- `GET /api/reports/:id`

## Notes

- The backend creates `doctor-interface.db` automatically on first run.
- Doctor sessions are JWT-based.
- Patient data is read from Supabase tables, not stored in the doctor app database.
- AI report generation requires Ollama to be running and the selected model to be available.
