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
    status: "scheduled",
    notes: "",
  });

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
      status: "scheduled",
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
      status: appointment.status,
      notes: appointment.notes || "",
    });
  };

  const handleDelete = async (appointmentId) => {
    setMessage("");
    setError("");

    try {
      await api.deleteAppointment(appointmentId);
      setMessage("Appointment deleted");
      await loadAppointments();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Appointments</p>
          <h2>Appointment management</h2>
        </div>
        <span className="counter">{appointments.length}</span>
      </div>

      <div className="split-grid">
        <form className="subpanel form-grid" onSubmit={handleSubmit}>
          <h3>{editingId ? "Edit appointment" : "Create appointment"}</h3>

          <label>
            Patient
            <select name="patientId" onChange={updateField} value={form.patientId} required>
              <option value="">Select a patient</option>
              {patientOptions.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Title
            <input
              name="title"
              onChange={updateField}
              type="text"
              value={form.title}
              placeholder="Cardiology Follow-up"
              required
            />
          </label>

          <label>
            Location
            <input
              name="location"
              onChange={updateField}
              type="text"
              value={form.location}
              placeholder="Room 204"
            />
          </label>

          <label>
            Scheduled at
            <input
              name="scheduledAt"
              onChange={updateField}
              type="datetime-local"
              value={form.scheduledAt}
              required
            />
          </label>

          <label>
            Duration (minutes)
            <input
              min="5"
              name="duration"
              onChange={updateField}
              type="number"
              value={form.duration}
              required
            />
          </label>

          <label>
            Status
            <select name="status" onChange={updateField} value={form.status}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            Notes
            <textarea name="notes" onChange={updateField} rows="4" value={form.notes} />
          </label>

          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}

          <div className="button-row">
            <button className="primary-button" type="submit">
              {editingId ? "Save changes" : "Create appointment"}
            </button>
            {editingId && (
              <button className="secondary-button" onClick={resetForm} type="button">
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <div className="subpanel">
          <h3>Upcoming appointments</h3>
          {upcoming.length === 0 ? (
            <p className="muted-text">No upcoming appointments.</p>
          ) : (
            <ul className="stack-list">
              {upcoming.map((appointment) => (
                <li key={appointment.id} className="list-card">
                  <strong>{patientLabelById[appointment.patientId] || `Patient ${appointment.patientId}`}</strong>
                  <span>{appointment.title}</span>
                  <span>{new Date(appointment.scheduledAt).toLocaleString()}</span>
                  <span>{appointment.duration} minutes</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="subpanel">
        <h3>All appointments</h3>
        {appointments.length === 0 ? (
          <p className="muted-text">No appointments created yet.</p>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Title</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{patientLabelById[appointment.patientId] || appointment.patientId}</td>
                    <td>{appointment.title}</td>
                    <td>{new Date(appointment.scheduledAt).toLocaleString()}</td>
                    <td>{appointment.status}</td>
                    <td>{appointment.duration} min</td>
                    <td>
                      <div className="button-row">
                        <button
                          className="secondary-button"
                          onClick={() => handleEdit(appointment)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="danger-button"
                          onClick={() => handleDelete(appointment.id)}
                          type="button"
                        >
                          Delete
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
