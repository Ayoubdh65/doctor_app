import { useState } from "react";

export default function LoginPage({ onLogin, onRegister, error }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    specialization: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setLocalError("");

    try {
      if (mode === "login") {
        await onLogin({
          username: form.username,
          password: form.password,
        });
      } else {
        await onRegister(form);
      }
    } catch (submitError) {
      setLocalError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Standalone doctor app</p>
          <h1>HealthGuard Doctor Interface</h1>
          <p>
            This application authenticates doctors locally, while patient vitals and history are
            pulled from your HealthGuard Supabase database through the doctor backend.
          </p>
          {mode === "register" && (
            <p className="muted-text">
              A doctor ID is generated when the account is created. Share that ID with the patient
              so their device can assign itself to your dashboard.
            </p>
          )}
        </div>

        <div>
          <div className="auth-tabs">
            <button
              className={mode === "login" ? "tab active" : "tab"}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={mode === "register" ? "tab active" : "tab"}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input name="username" onChange={updateField} value={form.username} required />
            </label>

            <label>
              Password
              <input
                name="password"
                onChange={updateField}
                type="password"
                value={form.password}
                required
              />
            </label>

            {mode === "register" && (
              <>
                <label>
                  Full name
                  <input name="fullName" onChange={updateField} value={form.fullName} required />
                </label>

                <label>
                  Specialization
                  <input
                    name="specialization"
                    onChange={updateField}
                    value={form.specialization}
                    placeholder="Cardiology, Internal Medicine, ..."
                  />
                </label>
              </>
            )}

            {(localError || error) && <p className="error-text">{localError || error}</p>}

            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
