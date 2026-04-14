import { useEffect, useState } from "react";

import { api } from "../api.js";

function getPatientId(patient) {
  return patient?.id ?? patient?.uuid;
}

function getPatientName(patient) {
  return [patient?.first_name, patient?.last_name].filter(Boolean).join(" ") || patient?.name || "-";
}

export default function ReportGenerator({ selectedPatient }) {
  const [period, setPeriod] = useState("24h");
  const [report, setReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectClass =
    "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";

  const loadReports = async (patientId) => {
    try {
      const reportItems = await api.getReports(patientId);
      setReports(reportItems);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    const patientId = getPatientId(selectedPatient);
    setReport(null);
    if (patientId) {
      loadReports(patientId);
    } else {
      setReports([]);
    }
  }, [selectedPatient]);

  const generateReport = async () => {
    const patientId = getPatientId(selectedPatient);
    if (!patientId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const generated = await api.generateReport({
        patientId,
        period,
      });
      setReport(generated);
      await loadReports(patientId);
    } catch (generateError) {
      setError(generateError.message);
    } finally {
      setLoading(false);
    }
  };

  const openReport = async (reportId) => {
    try {
      const fetched = await api.getReport(reportId);
      setReport(fetched);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">AI reports</p>
          <h2 className="text-xl font-black tracking-tight text-slate-900">Report generator with Ollama</h2>
        </div>
        <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {reports.length}
        </span>
      </div>

      {!selectedPatient ? (
        <p className="text-sm text-slate-500">Select a patient first to generate a doctor report.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
              <strong>Selected patient:</strong> {getPatientName(selectedPatient)}
            </div>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Period
              <select className={selectClass} onChange={(event) => setPeriod(event.target.value)} value={period}>
                <option value="1h">Last 1 hour</option>
                <option value="6h">Last 6 hours</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </label>
            <button
              className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={generateReport}
              type="button"
            >
              {loading ? "Generating..." : "Generate report"}
            </button>
          </div>

          {error && <p className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-lg font-bold text-slate-900">Saved reports</h3>
              {reports.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No reports generated yet.</p>
              ) : (
                <ul className="mt-3 grid gap-2">
                  {reports.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <button
                        className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                        onClick={() => openReport(item.id)}
                        type="button"
                      >
                        Report #{item.id}
                      </button>
                      <span className="text-xs text-slate-500 sm:text-sm">{new Date(item.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-lg font-bold text-slate-900">Generated markdown</h3>
              {report ? (
                <pre className="mt-3 max-h-[560px] overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm leading-relaxed text-slate-100 shadow-inner">
                  {report.content}
                </pre>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Generate a report to review the AI summary here.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
