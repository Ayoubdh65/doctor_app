import { useState } from "react";

import AppointmentManager from "./components/AppointmentManager.jsx";
import LoginPage from "./components/LoginPage.jsx";
import PatientDetail from "./components/PatientDetail.jsx";
import PatientList from "./components/PatientList.jsx";
import ReportGenerator from "./components/ReportGenerator.jsx";
import { useDoctorData } from "./hooks/useDoctorData.js";

export default function App() {
  const [view, setView] = useState("patients");
  const doctorData = useDoctorData();

  if (!doctorData.sessionReady) {
    return (
      <div className="auth-shell">
        <div className="panel">
          <p className="eyebrow">Doctor interface</p>
          <h2>Checking saved session...</h2>
        </div>
      </div>
    );
  }

  if (!doctorData.doctor) {
    return (
      <LoginPage
        error={doctorData.error}
        onLogin={doctorData.login}
        onRegister={doctorData.register}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Doctor interface</p>
          <h1>HealthGuard doctor app</h1>
          <p className="muted-text">
            Signed in as {doctorData.doctor.fullName} (
            {doctorData.doctor.specialization || "General"})
          </p>
          <p className="muted-text">Doctor ID: {doctorData.doctor.id}</p>
        </div>

        <div className="topbar-actions">
          <nav className="nav-tabs">
            <button
              className={view === "patients" ? "tab active" : "tab"}
              onClick={() => setView("patients")}
              type="button"
            >
              Patients
            </button>
            <button
              className={view === "appointments" ? "tab active" : "tab"}
              onClick={() => setView("appointments")}
              type="button"
            >
              Appointments
            </button>
            <button
              className={view === "reports" ? "tab active" : "tab"}
              onClick={() => setView("reports")}
              type="button"
            >
              Reports
            </button>
          </nav>

          <button className="secondary-button" onClick={doctorData.logout} type="button">
            Logout
          </button>
        </div>
      </header>

      {doctorData.error && <p className="error-banner">{doctorData.error}</p>}

      {view === "patients" && (
        <div className="content-grid">
          <PatientList
            loading={doctorData.loadingPatients}
            onSelect={doctorData.selectPatient}
            patients={doctorData.patients}
            selectedPatientId={doctorData.selectedPatientId}
          />
          <PatientDetail
            alertStats={doctorData.alertStats}
            alerts={doctorData.alerts}
            latestVitals={doctorData.latestVitals}
            loading={doctorData.loadingDetails}
            patient={doctorData.selectedPatient}
            vitalsHistory={doctorData.vitalsHistory}
            vitalsStats={doctorData.vitalsStats}
          />
        </div>
      )}

      {view === "appointments" && (
        <AppointmentManager
          patients={doctorData.patients}
          selectedPatient={doctorData.selectedPatient}
        />
      )}

      {view === "reports" && <ReportGenerator selectedPatient={doctorData.selectedPatient} />}
    </div>
  );
}
