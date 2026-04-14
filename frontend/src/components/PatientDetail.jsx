import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-800">{label}</div>
        <p className="text-sm text-slate-500">Not enough data for chart</p>
      </div>
    );
  }

  const min = Math.min(...numericPoints);
  const max = Math.max(...numericPoints);
  const padding = (max - min) * 0.15 || 1;
  const chartData = numericPoints.map((value, index) => ({
    value,
    index: index + 1,
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <strong className="text-base font-black text-slate-900">
          {numericPoints[numericPoints.length - 1].toFixed(1)}
        </strong>
      </div>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="index" hide />
            <YAxis domain={[min - padding, max + padding]} hide />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
              contentStyle={{ borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
              formatter={(value) => [Number(value).toFixed(1), label]}
              labelFormatter={(tick) => `Reading ${tick}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: "#ffffff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
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
  const metricCardClass =
    "rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white shadow-md";
  const detailRowClass = "flex items-center justify-between gap-3 border-b border-slate-200 py-2 text-sm";

  return (
    <section className="min-h-[640px] rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Patient detail</p>
          <h2 className="text-xl font-black tracking-tight text-slate-900">{getPatientName(patient)}</h2>
        </div>
        {patient && (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {getPatientBadge(patient)}
          </span>
        )}
      </div>

      {!patient ? (
        <p className="text-sm text-slate-500">Choose a patient to load centralized vitals and alerts.</p>
      ) : loading ? (
        <p className="text-sm text-slate-500">Loading latest vitals, history, and alerts...</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={metricCardClass}>
              <span className="text-xs uppercase tracking-wider text-slate-300">Heart rate</span>
              <strong className="mt-2 block text-2xl font-black">{metric(latestVitals?.heart_rate, " bpm")}</strong>
            </div>
            <div className={metricCardClass}>
              <span className="text-xs uppercase tracking-wider text-slate-300">SpO2</span>
              <strong className="mt-2 block text-2xl font-black">{metric(latestVitals?.spo2, "%")}</strong>
            </div>
            <div className={metricCardClass}>
              <span className="text-xs uppercase tracking-wider text-slate-300">Temperature</span>
              <strong className="mt-2 block text-2xl font-black">{metric(latestVitals?.temperature, " C")}</strong>
            </div>
            <div className={metricCardClass}>
              <span className="text-xs uppercase tracking-wider text-slate-300">Respiratory rate</span>
              <strong className="mt-2 block text-2xl font-black">
                {metric(latestVitals?.respiratory_rate, " rpm")}
              </strong>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
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

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-lg font-bold text-slate-900">Vitals statistics</h3>
              <dl className="mt-2">
                <div className={detailRowClass}>
                  <dt>Average HR</dt>
                  <dd className="font-semibold text-slate-900">{metric(vitalsStats?.heart_rate_avg, " bpm")}</dd>
                </div>
                <div className={detailRowClass}>
                  <dt>Average SpO2</dt>
                  <dd className="font-semibold text-slate-900">{metric(vitalsStats?.spo2_avg, "%")}</dd>
                </div>
                <div className={detailRowClass}>
                  <dt>Average temperature</dt>
                  <dd className="font-semibold text-slate-900">{metric(vitalsStats?.temperature_avg, " C")}</dd>
                </div>
                <div className={detailRowClass}>
                  <dt>Total readings</dt>
                  <dd className="font-semibold text-slate-900">{metric(vitalsStats?.total_readings)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-lg font-bold text-slate-900">Alert summary</h3>
              <dl className="mt-2">
                <div className={detailRowClass}>
                  <dt>Active alerts</dt>
                  <dd className="font-semibold text-slate-900">
                    {alertStats?.activeAlerts ?? alertStats?.active_alerts ?? 0}
                  </dd>
                </div>
                <div className={detailRowClass}>
                  <dt>Critical alerts</dt>
                  <dd className="font-semibold text-slate-900">
                    {alertStats?.criticalAlerts ?? alertStats?.critical_alerts ?? 0}
                  </dd>
                </div>
                <div className={detailRowClass}>
                  <dt>Total alerts</dt>
                  <dd className="font-semibold text-slate-900">
                    {alertStats?.totalAlerts ?? alertStats?.total_alerts ?? alerts.length}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-lg font-bold text-slate-900">Alerts history</h3>
            {alerts.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No alerts returned by the centralized backend.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Time</th>
                      <th className="px-3 py-2 text-left font-semibold">Type</th>
                      <th className="px-3 py-2 text-left font-semibold">Severity</th>
                      <th className="px-3 py-2 text-left font-semibold">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.slice(0, 10).map((alert) => (
                      <tr key={alert.id || alert.uuid} className="border-t border-slate-100 text-slate-700">
                        <td className="px-3 py-2 align-top">{new Date(alert.timestamp).toLocaleString()}</td>
                        <td className="px-3 py-2 align-top">{alert.alert_type || alert.type || "-"}</td>
                        <td className="px-3 py-2 align-top">{alert.severity || "-"}</td>
                        <td className="px-3 py-2 align-top">{alert.message || "-"}</td>
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
