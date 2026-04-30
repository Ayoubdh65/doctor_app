import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";

import LoginPage from "./components/LoginPage.jsx";
import { useDoctorData } from "./hooks/useDoctorData.js";

const AppointmentManager = lazy(() => import("./components/AppointmentManager.jsx"));
const PatientDetail = lazy(() => import("./components/PatientDetail.jsx"));
const PatientList = lazy(() => import("./components/PatientList.jsx"));
const ProfileSettings = lazy(() => import("./components/ProfileSettings.jsx"));
const ReportGenerator = lazy(() => import("./components/ReportGenerator.jsx"));

function LoadingPanel({ label = "Loading..." }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 text-sm font-medium text-slate-500 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md">
      {label}
    </section>
  );
}

export default function App() {
  const doctorData = useDoctorData();
  const tabBaseClass =
    "rounded-xl border px-4 py-2 text-sm font-semibold tracking-wide transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2";
  const activeTabClass = "border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-500/30";
  const inactiveTabClass =
    "border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700";
  const tabClass = ({ isActive }) =>
    `${tabBaseClass} ${isActive ? activeTabClass : inactiveTabClass}`;

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
          <p className="text-sm font-medium text-slate-500">
            Doctor Code: {doctorData.doctor.inviteCode || "Pending"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-2">
            <NavLink className={tabClass} to="/patients">
              Patients
            </NavLink>
            <NavLink className={tabClass} to="/appointments">
              Appointments
            </NavLink>
            <NavLink className={tabClass} to="/reports">
              Reports
            </NavLink>
            <NavLink className={tabClass} to="/profile">
              Profile
            </NavLink>
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

      <Suspense fallback={<div className="mx-auto w-full max-w-[1400px]"><LoadingPanel /></div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/patients" replace />} />
          <Route
            path="/patients"
            element={
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
            }
          />
          <Route
            path="/appointments"
            element={
              <div className="mx-auto w-full max-w-[1400px]">
                <AppointmentManager
                  patients={doctorData.patients}
                  selectedPatient={doctorData.selectedPatient}
                />
              </div>
            }
          />
          <Route
            path="/reports"
            element={
              <div className="mx-auto w-full max-w-[1400px]">
                <ReportGenerator
                  patients={doctorData.patients}
                  selectedPatient={doctorData.selectedPatient}
                  selectedPatientId={doctorData.selectedPatientId}
                  onSelectPatient={doctorData.selectPatient}
                />
              </div>
            }
          />
          <Route
            path="/profile"
            element={
              <ProfileSettings
                doctor={doctorData.doctor}
                onUpdatePassword={doctorData.updatePassword}
                onUpdateProfile={doctorData.updateProfile}
              />
            }
          />
          <Route path="*" element={<Navigate to="/patients" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
