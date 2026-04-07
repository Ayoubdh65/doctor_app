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
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Patients</p>
          <h2>Patient list</h2>
        </div>
        <span className="counter">{patients.length}</span>
      </div>

      {loading ? (
        <p className="muted-text">Loading patients from the centralized backend...</p>
      ) : (
        <div className="patient-list">
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
                className={isSelected ? "patient-card selected" : "patient-card"}
                onClick={() => onSelect(patientId)}
                type="button"
              >
                <div className="patient-card-top">
                  <div>
                    <strong>{getPatientName(patient)}</strong>
                    <p className="muted-text">
                      Age {getAge(patient.date_of_birth || patient.dateOfBirth)} | Blood type{" "}
                      {patient.blood_type || patient.bloodType || "-"}
                    </p>
                  </div>
                  <span className={activeAlerts > 0 ? "badge danger" : "badge"}>
                    {activeAlerts > 0 ? `${activeAlerts} alerts` : "Stable"}
                  </span>
                </div>
                <p className="muted-text">{formatLatestVitals(patient.latestVitals)}</p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
