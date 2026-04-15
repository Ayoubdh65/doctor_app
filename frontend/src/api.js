const API_BASE = import.meta.env.VITE_DOCTOR_API_URL || "/api";

export function getStoredToken() {
  return localStorage.getItem("doctor_token");
}

export function getStoredDoctor() {
  const raw = localStorage.getItem("doctor_user");
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, doctor) {
  localStorage.setItem("doctor_token", token);
  localStorage.setItem("doctor_user", JSON.stringify(doctor));
}

export function clearSession() {
  localStorage.removeItem("doctor_token");
  localStorage.removeItem("doctor_user");
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getStoredToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || payload.detail || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  register(payload) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  login(payload) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  me() {
    return request("/auth/me");
  },
  getPatients() {
    return request("/patients");
  },
  getPatient(id) {
    return request(`/patients/${id}`);
  },
  getLatestVitals(id) {
    return request(`/patients/${id}/vitals/latest`);
  },
  getVitalsHistory(id, period = "24h") {
    return request(`/patients/${id}/vitals/history?period=${encodeURIComponent(period)}`);
  },
  getVitalsStats(id, hours = 24) {
    return request(`/patients/${id}/vitals/stats?hours=${hours}`);
  },
  getAlerts(id) {
    return request(`/patients/${id}/alerts`);
  },
  getAlertStats(id) {
    return request(`/patients/${id}/alerts/stats`);
  },
  getAppointments(params = {}) {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, value);
      }
    });

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request(`/appointments${suffix}`);
  },
  getUpcomingAppointments() {
    return request("/appointments/upcoming");
  },
  createAppointment(payload) {
    return request("/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateAppointment(id, payload) {
    return request(`/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  cancelAppointment(id) {
    return request(`/appointments/${id}/cancel`, {
      method: "POST",
    });
  },
  deleteAppointment(id) {
    return request(`/appointments/${id}`, {
      method: "DELETE",
    });
  },
  generateReport(payload) {
    return request("/reports/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getReports(patientId) {
    const suffix = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
    return request(`/reports${suffix}`);
  },
  getReport(id) {
    return request(`/reports/${id}`);
  },
};
