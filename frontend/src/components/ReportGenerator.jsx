import { useEffect, useState } from "react";

import { api } from "../api.js";

function getPatientId(patient) {
  return patient?.id ?? patient?.uuid;
}

function getPatientName(patient) {
  return [patient?.first_name, patient?.last_name].filter(Boolean).join(" ") || patient?.name || "-";
}

function sanitizeFilenamePart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function buildPdfFilename(report, patient) {
  const patientName = sanitizeFilenamePart(getPatientName(patient)) || "patient";
  const reportId = sanitizeFilenamePart(report?.id) || "new";
  const createdAt = report?.createdAt
    ? new Date(report.createdAt).toISOString().slice(0, 10)
    : "latest";

  return `report-${patientName}-${reportId}-${createdAt}.pdf`;
}

function parseReportContent(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("## ")) {
        return {
          type: "heading",
          text: line.replace(/^##\s*/, ""),
        };
      }

      if (line.startsWith("- ")) {
        return {
          type: "bullet",
          text: line.replace(/^-+\s*/, ""),
        };
      }

      return {
        type: "paragraph",
        text: line,
      };
    });
}

async function exportReportPdf(targetReport, patient) {
  if (!targetReport?.content) {
    return;
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 18;
  const right = 18;
  const top = 18;
  const bottom = 18;
  const maxWidth = pageWidth - left - right;
  const blocks = parseReportContent(targetReport.content);
  let cursorY = top;
  let pageNumber = 1;

  const drawPageChrome = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(left, 10, maxWidth, 10, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(8, 47, 73);
    doc.text("HealthGuard Doctor Report", left + 4, 16.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${pageNumber}`, pageWidth - right - 10, pageHeight - 8, { align: "right" });
    doc.setTextColor(15, 23, 42);
  };

  const ensureSpace = (heightNeeded) => {
    if (cursorY + heightNeeded <= pageHeight - bottom) {
      return;
    }

    doc.addPage();
    pageNumber += 1;
    drawPageChrome();
    cursorY = top;
  };

  drawPageChrome();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("Remote Monitoring Report", left, cursorY + 6);
  cursorY += 14;

  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(left, cursorY, maxWidth, 24, 4, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(12, 74, 110);
  doc.text(`Patient`, left + 4, cursorY + 7);
  doc.text(`Generated`, left + 4, cursorY + 14);
  doc.text(`Report ID`, left + 4, cursorY + 21);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(getPatientName(patient), left + 28, cursorY + 7);
  doc.text(
    targetReport.createdAt ? new Date(targetReport.createdAt).toLocaleString() : "Latest",
    left + 28,
    cursorY + 14
  );
  doc.text(String(targetReport.id || "New"), left + 28, cursorY + 21);
  cursorY += 32;

  blocks.forEach((block) => {
    if (block.type === "heading") {
      ensureSpace(14);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(left, cursorY, maxWidth, 10, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(block.text, left + 4, cursorY + 6.8);
      cursorY += 14;
      return;
    }

    if (block.type === "bullet") {
      const wrapped = doc.splitTextToSize(block.text, maxWidth - 8);
      const blockHeight = wrapped.length * 5 + 2;
      ensureSpace(blockHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.circle(left + 2, cursorY + 1.8, 0.8, "F");
      doc.text(wrapped, left + 6, cursorY + 3);
      cursorY += wrapped.length * 5 + 3;
      return;
    }

    const wrapped = doc.splitTextToSize(block.text, maxWidth);
    const blockHeight = wrapped.length * 5 + 2;
    ensureSpace(blockHeight);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85);
    doc.text(wrapped, left, cursorY + 3);
    cursorY += wrapped.length * 5 + 3;
  });

  if (cursorY > pageHeight - bottom - 8) {
      doc.addPage();
      pageNumber += 1;
      drawPageChrome();
      cursorY = top;
    }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Generated from remote monitoring data for clinician review.", left, pageHeight - 8);

  doc.save(buildPdfFilename(targetReport, patient));
}

export default function ReportGenerator({
  patients = [],
  selectedPatient,
  selectedPatientId,
  onSelectPatient,
}) {
  const [period, setPeriod] = useState("24h");
  const [report, setReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectClass =
    "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";
  const activePatientId = selectedPatientId || getPatientId(selectedPatient) || "";
  const activePatient =
    patients.find((patient) => String(getPatientId(patient)) === String(activePatientId)) || selectedPatient;

  const loadReports = async (patientId) => {
    try {
      const reportItems = await api.getReports(patientId);
      setReports(reportItems);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    setReport(null);
    if (activePatientId) {
      loadReports(activePatientId);
    } else {
      setReports([]);
    }
  }, [activePatientId]);

  const generateReport = async () => {
    const patientId = activePatientId;
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

      {!activePatientId ? (
        <p className="text-sm text-slate-500">Select a patient first to generate a doctor report.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Patient
              <select
                className={selectClass}
                onChange={(event) => onSelectPatient?.(event.target.value)}
                value={activePatientId}
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => {
                  const patientId = getPatientId(patient);
                  return (
                    <option key={patientId} value={patientId}>
                      {getPatientName(patient)}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
              <strong>Selected patient:</strong> {getPatientName(activePatient)}
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 sm:text-sm">{new Date(item.createdAt).toLocaleString()}</span>
                        <button
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          onClick={() => exportReportPdf(item, activePatient)}
                          type="button"
                        >
                          PDF
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">Generated markdown</h3>
                <button
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!report?.content}
                  onClick={() => exportReportPdf(report, activePatient)}
                  type="button"
                >
                  Download PDF
                </button>
              </div>
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
