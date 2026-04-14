function getPatientName(patient) {
  const fromParts = [patient.first_name, patient.last_name].filter(Boolean).join(" ");
  return fromParts || patient.name || `Patient ${patient.id}`;
}

function getPatientId(patient) {
  return patient.id ?? patient.uuid;
}

function getAge(dateOfBirth) {
  if (!dateOfBirth) {
    return "-";
  }

  const birthDate = new Date(dateOfBirth);
  const ageDiff = Date.now() - birthDate.getTime();
  return Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);
}

function formatLatestVitals(vitals) {
  if (!vitals) {
    return "No vitals";
  }

  const temperature = Number(vitals.temperature);

  return [
    vitals.heart_rate ? `HR ${Math.round(vitals.heart_rate)}` : null,
    vitals.spo2 ? `SpO2 ${Math.round(vitals.spo2)}%` : null,
    Number.isFinite(temperature) ? `Temp ${temperature.toFixed(1)}C` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export default function PatientList({ patients, selectedPatientId, onSelect, loading }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Patients</p>
          <h2 className="text-xl font-black tracking-tight text-slate-900">Patient list</h2>
        </div>
        <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {patients.length}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading patients from the centralized backend...</p>
      ) : (
        <div className="grid gap-3">
          {patients.map((patient) => {
            const patientId = getPatientId(patient);
            const isSelected = String(patientId) === String(selectedPatientId);
            const activeAlerts =
              patient.alertStats?.activeAlerts ??
              patient.alertStats?.active_alerts ??
              patient.alertStats?.total_active ??
              0;

            return (
              <button
                key={patientId}
                className={
                  isSelected
                    ? "rounded-2xl border border-cyan-400 bg-cyan-50/80 p-4 text-left shadow-sm transition"
                    : "rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50/60"
                }
                onClick={() => onSelect(patientId)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-base font-bold text-slate-900">{getPatientName(patient)}</strong>
                    <p className="mt-1 text-sm text-slate-500">
                      Age {getAge(patient.date_of_birth || patient.dateOfBirth)} | Blood type{" "}
                      {patient.blood_type || patient.bloodType || "-"}
                    </p>
                  </div>
                  <span
                    className={
                      activeAlerts > 0
                        ? "inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700"
                        : "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"
                    }
                  >
                    {activeAlerts > 0 ? `${activeAlerts} alerts` : "Stable"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{formatLatestVitals(patient.latestVitals)}</p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
