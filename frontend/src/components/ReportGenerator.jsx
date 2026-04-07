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
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI reports</p>
          <h2>Report generator with Ollama</h2>
        </div>
        <span className="counter">{reports.length}</span>
      </div>

      {!selectedPatient ? (
        <p className="muted-text">Select a patient first to generate a doctor report.</p>
      ) : (
        <>
          <div className="subpanel form-inline">
            <div>
              <strong>Selected patient:</strong> {getPatientName(selectedPatient)}
            </div>
            <label>
              Period
              <select onChange={(event) => setPeriod(event.target.value)} value={period}>
                <option value="1h">Last 1 hour</option>
                <option value="6h">Last 6 hours</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </label>
            <button
              className="primary-button"
              disabled={loading}
              onClick={generateReport}
              type="button"
            >
              {loading ? "Generating..." : "Generate report"}
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="split-grid">
            <div className="subpanel">
              <h3>Saved reports</h3>
              {reports.length === 0 ? (
                <p className="muted-text">No reports generated yet.</p>
              ) : (
                <ul className="stack-list">
                  {reports.map((item) => (
                    <li key={item.id} className="list-card">
                      <button className="text-button" onClick={() => openReport(item.id)} type="button">
                        Report #{item.id}
                      </button>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="subpanel">
              <h3>Generated markdown</h3>
              {report ? (
                <pre className="report-output">{report.content}</pre>
              ) : (
                <p className="muted-text">Generate a report to review the AI summary here.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
