import { useEffect, useMemo, useState } from "react";

import { api } from "../api.js";

function toInputDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const pad = (item) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function getPatientId(patient) {
  return patient?.id ?? patient?.uuid ?? "";
}

function getMinimumAppointmentDateTime() {
  const date = new Date();
  date.setSeconds(0, 0);
  const pad = (item) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function getScheduleFieldError(message) {
  if (!message) {
    return "";
  }

  if (message.includes("overlaps another appointment")) {
    return "This slot is already taken, choose another time.";
  }

  if (message.includes("cannot be before the current date and time")) {
    return "Choose a future date and time for the appointment.";
  }

  if (message.includes("valid appointment date and time")) {
    return "Please pick a valid date and time.";
  }

  return "";
}

export default function AppointmentManager({ patients, selectedPatient }) {
  const [appointments, setAppointments] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patientId: getPatientId(selectedPatient),
    title: "Medical Appointment",
    location: "",
    scheduledAt: "",
    duration: 30,
    notes: "",
  });
  const minimumAppointmentDateTime = getMinimumAppointmentDateTime();
  const scheduleFieldError = getScheduleFieldError(error);
  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";
  const labelClass = "text-sm font-semibold text-slate-700";
  const actionButtonClass =
    "rounded-xl border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  const patientOptions = useMemo(
    () =>
      patients.map((patient) => ({
        id: getPatientId(patient),
        label:
          [patient.first_name, patient.last_name].filter(Boolean).join(" ") ||
          patient.name ||
          `Patient ${getPatientId(patient)}`,
      })),
    [patients]
  );

  const patientLabelById = useMemo(
    () => Object.fromEntries(patientOptions.map((patient) => [patient.id, patient.label])),
    [patientOptions]
  );

  const loadAppointments = async () => {
    try {
      const [allAppointments, upcomingAppointments] = await Promise.all([
        api.getAppointments(),
        api.getUpcomingAppointments(),
      ]);
      setAppointments(allAppointments);
      setUpcoming(upcomingAppointments);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (getPatientId(selectedPatient)) {
      setForm((current) => ({
        ...current,
        patientId: getPatientId(selectedPatient),
      }));
    }
  }, [selectedPatient]);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      patientId: getPatientId(selectedPatient),
      title: "Medical Appointment",
      location: "",
      scheduledAt: "",
      duration: 30,
      notes: "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      if (editingId) {
        await api.updateAppointment(editingId, form);
        setMessage("Appointment updated");
      } else {
        await api.createAppointment(form);
        setMessage("Appointment created");
      }

      resetForm();
      await loadAppointments();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const handleEdit = (appointment) => {
    setEditingId(appointment.id);
    setForm({
      patientId: appointment.patientId,
      title: appointment.title || "Medical Appointment",
      location: appointment.location || "",
      scheduledAt: toInputDateTime(appointment.scheduledAt),
      duration: appointment.duration,
      notes: appointment.notes || "",
    });
  };

  const handleCancelAppointment = async (appointmentId) => {
    setMessage("");
    setError("");

    try {
      await api.cancelAppointment(appointmentId);
      setMessage("Appointment canceled and the patient will be notified");
      if (editingId === appointmentId) {
        resetForm();
      }
      await loadAppointments();
    } catch (cancelError) {
      setError(cancelError.message);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Appointments</p>
          <h2 className="text-xl font-black tracking-tight text-slate-900">Appointment management</h2>
        </div>
        <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {appointments.length}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4" onSubmit={handleSubmit}>
          <h3 className="text-lg font-bold text-slate-900">{editingId ? "Edit appointment" : "Create appointment"}</h3>

          <label className={labelClass}>
            Patient
            <select
              className={inputClass}
              name="patientId"
              onChange={updateField}
              value={form.patientId}
              required
            >
              <option value="">Select a patient</option>
              {patientOptions.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.label}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Title
            <input
              className={inputClass}
              name="title"
              onChange={updateField}
              type="text"
              value={form.title}
              placeholder="Cardiology Follow-up"
              required
            />
          </label>

          <label className={labelClass}>
            Location
            <input
              className={inputClass}
              name="location"
              onChange={updateField}
              type="text"
              value={form.location}
              placeholder="Room 204"
            />
          </label>

          <label className={labelClass}>
            Scheduled at
            <input
              className={inputClass}
              min={minimumAppointmentDateTime}
              name="scheduledAt"
              onChange={updateField}
              type="datetime-local"
              value={form.scheduledAt}
              required
            />
            {scheduleFieldError && (
              <span className="mt-2 block text-sm font-medium text-rose-600">
                {scheduleFieldError}
              </span>
            )}
          </label>

          <label className={labelClass}>
            Duration (minutes)
            <input
              className={inputClass}
              min="5"
              name="duration"
              onChange={updateField}
              type="number"
              value={form.duration}
              required
            />
          </label>

          <label className={labelClass}>
            Notes
            <textarea className={inputClass} name="notes" onChange={updateField} rows="4" value={form.notes} />
          </label>

          {message && (
            <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {message}
            </p>
          )}
          {error && <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-700"
              type="submit"
            >
              {editingId ? "Save changes" : "Create appointment"}
            </button>
            {editingId && (
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={resetForm}
                type="button"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <h3 className="text-lg font-bold text-slate-900">Upcoming appointments</h3>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No upcoming appointments.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {upcoming.map((appointment) => (
                <li key={appointment.id} className="grid gap-1 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <strong className="text-slate-900">
                    {patientLabelById[appointment.patientId] || `Patient ${appointment.patientId}`}
                  </strong>
                  <span className="text-slate-700">{appointment.title}</span>
                  <span className="text-slate-600">{new Date(appointment.scheduledAt).toLocaleString()}</span>
                  <span className="font-medium text-slate-700">{appointment.duration} minutes</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <h3 className="text-lg font-bold text-slate-900">All appointments</h3>
        {appointments.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No appointments created yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Patient</th>
                  <th className="px-3 py-2 text-left font-semibold">Title</th>
                  <th className="px-3 py-2 text-left font-semibold">Scheduled</th>
                  <th className="px-3 py-2 text-left font-semibold">Duration</th>
                  <th className="px-3 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-3 py-2 align-top">{patientLabelById[appointment.patientId] || appointment.patientId}</td>
                    <td className="px-3 py-2 align-top">{appointment.title}</td>
                    <td className="px-3 py-2 align-top">{new Date(appointment.scheduledAt).toLocaleString()}</td>
                    <td className="px-3 py-2 align-top">{appointment.duration} min</td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={`${actionButtonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300`}
                          onClick={() => handleEdit(appointment)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className={`${actionButtonClass} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-300`}
                          onClick={() => handleCancelAppointment(appointment.id)}
                          type="button"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
