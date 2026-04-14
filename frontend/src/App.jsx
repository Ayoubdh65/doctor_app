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
  const tabBaseClass =
    "rounded-xl border px-4 py-2 text-sm font-semibold tracking-wide transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2";
  const activeTabClass = "border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-500/30";
  const inactiveTabClass =
    "border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700";

  if (!doctorData.sessionReady) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#f8fafc_42%,_#eef2ff_100%)] px-4 py-12 sm:px-8">
        <div className="mx-auto flex min-h-[68vh] max-w-5xl items-center justify-center">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200/90 bg-white/90 p-8 shadow-[0_30px_70px_-30px_rgba(15,23,42,0.5)] backdrop-blur-md sm:p-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Doctor interface</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Checking saved session...
            </h2>
          </div>
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#bfdbfe_0%,_#f8fafc_38%,_#e0e7ff_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <header className="mx-auto mb-6 flex w-full max-w-[1400px] flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_25px_65px_-28px_rgba(30,41,59,0.55)] backdrop-blur-md lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Doctor interface</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">HealthGuard doctor app</h1>
          <p className="text-sm text-slate-600 sm:text-base">
            Signed in as {doctorData.doctor.fullName} (
            {doctorData.doctor.specialization || "General"})
          </p>
          <p className="text-sm font-medium text-slate-500">Doctor ID: {doctorData.doctor.id}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-2">
            <button
              className={`${tabBaseClass} ${view === "patients" ? activeTabClass : inactiveTabClass}`}
              onClick={() => setView("patients")}
              type="button"
            >
              Patients
            </button>
            <button
              className={`${tabBaseClass} ${view === "appointments" ? activeTabClass : inactiveTabClass}`}
              onClick={() => setView("appointments")}
              type="button"
            >
              Appointments
            </button>
            <button
              className={`${tabBaseClass} ${view === "reports" ? activeTabClass : inactiveTabClass}`}
              onClick={() => setView("reports")}
              type="button"
            >
              Reports
            </button>
          </nav>

          <button
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
            onClick={doctorData.logout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      {doctorData.error && (
        <p className="mx-auto mb-4 w-full max-w-[1400px] rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
          {doctorData.error}
        </p>
      )}

      {view === "patients" && (
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
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
        <div className="mx-auto w-full max-w-[1400px]">
          <AppointmentManager
            patients={doctorData.patients}
            selectedPatient={doctorData.selectedPatient}
          />
        </div>
      )}

      {view === "reports" && (
        <div className="mx-auto w-full max-w-[1400px]">
          <ReportGenerator selectedPatient={doctorData.selectedPatient} />
        </div>
      )}
    </div>
  );
}
