function metric(value, suffix = "") {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  if (typeof value === "number") {
    return `${value.toFixed(1)}${suffix}`;
  }

  return `${value}${suffix}`;
}

function getPatientName(patient) {
  if (!patient) {
    return "Select a patient";
  }

  return [patient.first_name, patient.last_name].filter(Boolean).join(" ") || patient.name;
}

function getPatientBadge(patient) {
  return patient?.medical_id || patient?.id || patient?.uuid || "-";
}

function Sparkline({ label, points, color }) {
  const numericPoints = points
    .map((point) => Number(point))
    .filter((value) => Number.isFinite(value));

  if (numericPoints.length < 2) {
    return (
      <div className="chart-card">
        <div className="chart-title">{label}</div>
        <p className="muted-text">Not enough data for chart</p>
      </div>
    );
  }

  const min = Math.min(...numericPoints);
  const max = Math.max(...numericPoints);
  const range = max - min || 1;

  const polyline = numericPoints
    .map((value, index) => {
      const x = (index / (numericPoints.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="chart-card">
      <div className="chart-title">
        <span>{label}</span>
        <strong>{numericPoints[numericPoints.length - 1].toFixed(1)}</strong>
      </div>
      <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline fill="none" points={polyline} stroke={color} strokeWidth="3" />
      </svg>
    </div>
  );
}

export default function PatientDetail({
  patient,
  latestVitals,
  vitalsHistory,
  vitalsStats,
  alerts,
  alertStats,
  loading,
}) {
  const historyItems = Array.isArray(vitalsHistory) ? vitalsHistory : [];

  return (
    <section className="panel detail-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Patient detail</p>
          <h2>{getPatientName(patient)}</h2>
        </div>
        {patient && <span className="badge">{getPatientBadge(patient)}</span>}
      </div>

      {!patient ? (
        <p className="muted-text">Choose a patient to load centralized vitals and alerts.</p>
      ) : loading ? (
        <p className="muted-text">Loading latest vitals, history, and alerts...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="metric-card">
              <span>Heart rate</span>
              <strong>{metric(latestVitals?.heart_rate, " bpm")}</strong>
            </div>
            <div className="metric-card">
              <span>SpO2</span>
              <strong>{metric(latestVitals?.spo2, "%")}</strong>
            </div>
            <div className="metric-card">
              <span>Temperature</span>
              <strong>{metric(latestVitals?.temperature, " C")}</strong>
            </div>
            <div className="metric-card">
              <span>Respiratory rate</span>
              <strong>{metric(latestVitals?.respiratory_rate, " rpm")}</strong>
            </div>
          </div>

          <div className="charts-grid">
            <Sparkline
              color="#e85d04"
              label="Heart rate trend"
              points={historyItems.map((item) => item.heart_rate)}
            />
            <Sparkline
              color="#2a9d8f"
              label="SpO2 trend"
              points={historyItems.map((item) => item.spo2)}
            />
            <Sparkline
              color="#6c5ce7"
              label="Temperature trend"
              points={historyItems.map((item) => item.temperature)}
            />
          </div>

          <div className="split-grid">
            <div className="subpanel">
              <h3>Vitals statistics</h3>
              <dl className="detail-list">
                <div>
                  <dt>Average HR</dt>
                  <dd>{metric(vitalsStats?.heart_rate_avg, " bpm")}</dd>
                </div>
                <div>
                  <dt>Average SpO2</dt>
                  <dd>{metric(vitalsStats?.spo2_avg, "%")}</dd>
                </div>
                <div>
                  <dt>Average temperature</dt>
                  <dd>{metric(vitalsStats?.temperature_avg, " C")}</dd>
                </div>
                <div>
                  <dt>Total readings</dt>
                  <dd>{metric(vitalsStats?.total_readings)}</dd>
                </div>
              </dl>
            </div>

            <div className="subpanel">
              <h3>Alert summary</h3>
              <dl className="detail-list">
                <div>
                  <dt>Active alerts</dt>
                  <dd>{alertStats?.activeAlerts ?? alertStats?.active_alerts ?? 0}</dd>
                </div>
                <div>
                  <dt>Critical alerts</dt>
                  <dd>{alertStats?.criticalAlerts ?? alertStats?.critical_alerts ?? 0}</dd>
                </div>
                <div>
                  <dt>Total alerts</dt>
                  <dd>{alertStats?.totalAlerts ?? alertStats?.total_alerts ?? alerts.length}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="subpanel">
            <h3>Alerts history</h3>
            {alerts.length === 0 ? (
              <p className="muted-text">No alerts returned by the centralized backend.</p>
            ) : (
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.slice(0, 10).map((alert) => (
                      <tr key={alert.id || alert.uuid}>
                        <td>{new Date(alert.timestamp).toLocaleString()}</td>
                        <td>{alert.alert_type || alert.type || "-"}</td>
                        <td>{alert.severity || "-"}</td>
                        <td>{alert.message || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
