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
  const tabBaseClass =
    "rounded-xl border px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2";
  const activeTabClass = "border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-500/25";
  const inactiveTabClass =
    "border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700";
  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0%,_#f8fafc_42%,_#e0e7ff_100%)] px-4 py-10 sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_75px_-30px_rgba(15,23,42,0.55)] backdrop-blur-md md:grid-cols-[1.1fr_1fr] md:p-8">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Standalone doctor app</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            HealthGuard Doctor Interface
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            This application authenticates doctors locally, while patient vitals and history are
            pulled from your HealthGuard Supabase database through the doctor backend.
          </p>
          {mode === "register" && (
            <p className="rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm leading-relaxed text-cyan-800">
              A shareable doctor code is generated when the account is created. Share that code
              with the patient so their device can assign itself to your dashboard.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              className={`${tabBaseClass} ${mode === "login" ? activeTabClass : inactiveTabClass}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={`${tabBaseClass} ${mode === "register" ? activeTabClass : inactiveTabClass}`}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="text-sm font-semibold text-slate-700">
              Username
              <input
                className={inputClass}
                name="username"
                onChange={updateField}
                value={form.username}
                required
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Password
              <input
                className={inputClass}
                name="password"
                onChange={updateField}
                type="password"
                value={form.password}
                required
              />
            </label>

            {mode === "register" && (
              <>
                <label className="text-sm font-semibold text-slate-700">
                  Full name
                  <input
                    className={inputClass}
                    name="fullName"
                    onChange={updateField}
                    value={form.fullName}
                    required
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Specialization
                  <input
                    className={inputClass}
                    name="specialization"
                    onChange={updateField}
                    value={form.specialization}
                    placeholder="Cardiology, Internal Medicine, ..."
                  />
                </label>
              </>
            )}

            {(localError || error) && (
              <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {localError || error}
              </p>
            )}

            <button
              className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
