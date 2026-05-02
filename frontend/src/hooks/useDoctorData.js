import { useEffect, useRef, useState } from "react";

import { api, clearSession, getStoredDoctor, getStoredToken, setSession } from "../api.js";

const AUTO_REFRESH_INTERVAL_MS = 30000;
const CHART_HISTORY_LIMIT = 80;

function getPatientId(patient) {
  return patient?.id ?? patient?.uuid;
}

function normalizeCollection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.patients)) {
    return payload.patients;
  }

  return [];
}

async function enrichPatient(patient) {
  const patientId = getPatientId(patient);
  const [latestResult, alertStatsResult] = await Promise.allSettled([
    api.getLatestVitals(patientId),
    api.getAlertStats(patientId),
  ]);

  return {
    ...patient,
    latestVitals: latestResult.status === "fulfilled" ? latestResult.value : null,
    alertStats:
      alertStatsResult.status === "fulfilled"
        ? alertStatsResult.value
        : { activeAlerts: 0, criticalAlerts: 0 },
  };
}

export function useDoctorData() {
  const [doctor, setDoctor] = useState(getStoredDoctor());
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [latestVitals, setLatestVitals] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [vitalsStats, setVitalsStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sessionReady, setSessionReady] = useState(!getStoredDoctor());
  const [error, setError] = useState("");
  const loadingPatientsRef = useRef(false);
  const loadingDetailsRef = useRef(false);
  const loadingVitalsRef = useRef(false);

  const loadPatients = async ({ silent = false } = {}) => {
    if (loadingPatientsRef.current) {
      return;
    }

    loadingPatientsRef.current = true;
    if (!silent) {
      setLoadingPatients(true);
      setError("");
    }

    try {
      const rawPatients = normalizeCollection(await api.getPatients());
      const enrichedPatients = await Promise.all(rawPatients.map(enrichPatient));
      setPatients(enrichedPatients);

      if (enrichedPatients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(String(getPatientId(enrichedPatients[0])));
      }
    } catch (loadError) {
      if (!silent) {
        setError(loadError.message);
      }
    } finally {
      loadingPatientsRef.current = false;
      if (!silent) {
        setLoadingPatients(false);
      }
    }
  };

  const loadPatientDetails = async (patientId, { silent = false } = {}) => {
    if (!patientId) {
      return;
    }

    if (loadingDetailsRef.current) {
      return;
    }

    loadingDetailsRef.current = true;
    if (!silent) {
      setLoadingDetails(true);
      setError("");
    }

    try {
      const [patient, latest, history, stats, patientAlerts, statsAlerts] = await Promise.all([
        api.getPatient(patientId),
        api.getLatestVitals(patientId),
        api.getVitalsHistory(patientId, "24h", CHART_HISTORY_LIMIT),
        api.getVitalsStats(patientId, 24),
        api.getAlerts(patientId),
        api.getAlertStats(patientId),
      ]);

      setSelectedPatient(patient);
      setLatestVitals(latest);
      setVitalsHistory(history.points || history.items || history || []);
      setVitalsStats(stats);
      setAlerts(normalizeCollection(patientAlerts));
      setAlertStats(statsAlerts);
    } catch (loadError) {
      if (!silent) {
        setError(loadError.message);
      }
    } finally {
      loadingDetailsRef.current = false;
      if (!silent) {
        setLoadingDetails(false);
      }
    }
  };

  const refreshPatientVitals = async (patientId) => {
    if (!patientId || loadingVitalsRef.current) {
      return;
    }

    loadingVitalsRef.current = true;

    try {
      const [latest, history, stats] = await Promise.all([
        api.getLatestVitals(patientId),
        api.getVitalsHistory(patientId, "24h", CHART_HISTORY_LIMIT),
        api.getVitalsStats(patientId, 24),
      ]);

      setLatestVitals(latest);
      setVitalsHistory(history.points || history.items || history || []);
      setVitalsStats(stats);
    } finally {
      loadingVitalsRef.current = false;
    }
  };

  const login = async (payload) => {
    const result = await api.login(payload);
    setSession(result.token, result.doctor);
    setDoctor(result.doctor);
    return result.doctor;
  };

  const register = async (payload) => {
    const result = await api.register(payload);
    setSession(result.token, result.doctor);
    setDoctor(result.doctor);
    return result.doctor;
  };

  const updateProfile = async (payload) => {
    const result = await api.updateProfile(payload);
    setSession(result.token, result.doctor);
    setDoctor(result.doctor);
    return result.doctor;
  };

  const updatePassword = async (payload) => api.updatePassword(payload);

  const logout = () => {
    clearSession();
    setDoctor(null);
    setPatients([]);
    setSelectedPatientId(null);
    setSelectedPatient(null);
    setLatestVitals(null);
    setVitalsHistory([]);
    setVitalsStats(null);
    setAlerts([]);
    setAlertStats(null);
  };

  useEffect(() => {
    if (doctor && sessionReady) {
      loadPatients();
    }
  }, [doctor, sessionReady]);

  useEffect(() => {
    if (doctor && sessionReady && selectedPatientId) {
      loadPatientDetails(selectedPatientId);
    }
  }, [doctor, sessionReady, selectedPatientId]);

  useEffect(() => {
    if (!doctor || !sessionReady || !selectedPatientId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      refreshPatientVitals(selectedPatientId);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [doctor, sessionReady, selectedPatientId]);

  useEffect(() => {
    const token = getStoredToken();

    if (!doctor || !token) {
      setSessionReady(true);
      return;
    }

    let cancelled = false;

    api
      .me()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setDoctor(result.doctor);
        setSession(token, result.doctor);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        clearSession();
        setDoctor(null);
      })
      .finally(() => {
        if (!cancelled) {
          setSessionReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    doctor,
    patients,
    selectedPatientId,
    selectedPatient,
    latestVitals,
    vitalsHistory,
    vitalsStats,
    alerts,
    alertStats,
    loadingPatients,
    loadingDetails,
    sessionReady,
    error,
    login,
    register,
    updateProfile,
    updatePassword,
    logout,
    selectPatient: (patientId) => setSelectedPatientId(String(patientId)),
    refreshPatients: loadPatients,
    refreshPatientDetails: () => loadPatientDetails(selectedPatientId),
  };
}
