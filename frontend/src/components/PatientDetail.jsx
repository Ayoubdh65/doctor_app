import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

const VITAL_TREND_CONFIG = [
  { key: "heart_rate", label: "Heart rate trend", color: "#ef4444" },
  { key: "spo2", label: "SpO2 trend", color: "#3b82f6" },
  { key: "temperature", label: "Temperature trend", color: "#f59e0b" },
  { key: "blood_pressure_sys", label: "BP systolic trend", color: "#8b5cf6" },
  { key: "blood_pressure_dia", label: "BP diastolic trend", color: "#a78bfa" },
  { key: "respiratory_rate", label: "Respiratory rate trend", color: "#10b981" },
];

const VITAL_STATS_CONFIG = [
  { key: "heart_rate_avg", label: "Average HR", suffix: " bpm" },
  { key: "spo2_avg", label: "Average SpO2", suffix: "%" },
  { key: "temperature_avg", label: "Average temperature", suffix: " C" },
  { key: "blood_pressure_sys_avg", label: "Average BP systolic", suffix: " mmHg" },
  { key: "blood_pressure_dia_avg", label: "Average BP diastolic", suffix: " mmHg" },
  { key: "respiratory_rate_avg", label: "Average respiratory rate", suffix: " rpm" },
];

function Sparkline({ vitalKey, label, points, color }) {
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
          <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-fill-${vitalKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="index" hide />
            <YAxis domain={[min - padding, max + padding]} hide />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid #cbd5e1",
                backgroundColor: "rgba(255,255,255,0.96)",
                boxShadow: "0 18px 35px -24px rgba(15, 23, 42, 0.35)",
              }}
              formatter={(value) => [Number(value).toFixed(1), label]}
              labelFormatter={(tick) => `Reading ${tick}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={`url(#spark-fill-${vitalKey})`}
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 3, fill: color, stroke: "#ffffff", strokeWidth: 1.5 }}
              animationDuration={300}
            />
          </AreaChart>
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
  const detailRowClass = "flex items-center justify-between gap-3 border-b border-slate-200 py-2 text-sm";
  const statsSource = vitalsStats || {};

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
          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {VITAL_TREND_CONFIG.map((item) => (
              <Sparkline
                key={item.key}
                vitalKey={item.key}
                color={item.color}
                label={item.label}
                points={historyItems.map((historyItem) => historyItem?.[item.key])}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-lg font-bold text-slate-900">Vitals statistics</h3>
              <dl className="mt-2">
                {VITAL_STATS_CONFIG.map((item) => (
                  <div key={item.key} className={detailRowClass}>
                    <dt>{item.label}</dt>
                    <dd className="font-semibold text-slate-900">{metric(statsSource[item.key], item.suffix)}</dd>
                  </div>
                ))}
                <div className={detailRowClass}>
                  <dt>Total readings</dt>
                  <dd className="font-semibold text-slate-900">{metric(statsSource.total_readings)}</dd>
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
