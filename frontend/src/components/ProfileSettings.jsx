import { useEffect, useState } from "react";

export default function ProfileSettings({ doctor, onUpdatePassword, onUpdateProfile }) {
  const [form, setForm] = useState({
    fullName: doctor?.fullName || "",
    email: doctor?.email || "",
    specialization: doctor?.specialization || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";
  const labelClass = "text-sm font-semibold text-slate-700";

  useEffect(() => {
    setForm({
      fullName: doctor?.fullName || "",
      email: doctor?.email || "",
      specialization: doctor?.specialization || "",
    });
  }, [doctor]);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const updatePasswordField = (event) => {
    setPasswordForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      await onUpdateProfile(form);
      setMessage("Profile updated");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }

    setSavingPassword(true);

    try {
      await onUpdatePassword(passwordForm);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage("Password updated");
    } catch (submitError) {
      setPasswordError(submitError.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1400px] rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Profile</p>
          <h2 className="text-xl font-black tracking-tight text-slate-900">Doctor profile settings</h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {doctor?.inviteCode || "Pending"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4" onSubmit={handleSubmit}>
            <h3 className="text-lg font-bold text-slate-900">Personal information</h3>

            <label className={labelClass}>
              Full name
              <input
                className={inputClass}
                maxLength={80}
                minLength={2}
                name="fullName"
                onChange={updateField}
                required
                value={form.fullName}
              />
            </label>

            <label className={labelClass}>
              Email
              <input
                autoComplete="email"
                className={inputClass}
                name="email"
                onChange={updateField}
                required
                type="email"
                value={form.email}
              />
            </label>

            <label className={labelClass}>
              Specialization
              <input
                className={inputClass}
                maxLength={80}
                name="specialization"
                onChange={updateField}
                placeholder="Cardiology, Internal Medicine, ..."
                value={form.specialization}
              />
            </label>

            {message && (
              <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {message}
              </p>
            )}
            {error && (
              <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {error}
              </p>
            )}

            <div>
              <button
                className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>

          <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4" onSubmit={handlePasswordSubmit}>
            <h3 className="text-lg font-bold text-slate-900">Change password</h3>

            <label className={labelClass}>
              Current password
              <input
                autoComplete="current-password"
                className={inputClass}
                maxLength={72}
                minLength={8}
                name="currentPassword"
                onChange={updatePasswordField}
                required
                type="password"
                value={passwordForm.currentPassword}
              />
            </label>

            <label className={labelClass}>
              New password
              <input
                autoComplete="new-password"
                className={inputClass}
                maxLength={72}
                minLength={8}
                name="newPassword"
                onChange={updatePasswordField}
                required
                type="password"
                value={passwordForm.newPassword}
              />
              <span className="mt-1 block text-xs font-medium text-slate-500">
                Password must be 8 to 72 characters.
              </span>
            </label>

            <label className={labelClass}>
              Confirm new password
              <input
                autoComplete="new-password"
                className={inputClass}
                maxLength={72}
                minLength={8}
                name="confirmPassword"
                onChange={updatePasswordField}
                required
                type="password"
                value={passwordForm.confirmPassword}
              />
            </label>

            {passwordMessage && (
              <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {passwordMessage}
              </p>
            )}
            {passwordError && (
              <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {passwordError}
              </p>
            )}

            <div>
              <button
                className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingPassword}
                type="submit"
              >
                {savingPassword ? "Saving..." : "Update password"}
              </button>
            </div>
          </form>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <h3 className="text-lg font-bold text-slate-900">Doctor code</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Share this code with patients so they can connect their device data to your dashboard.
          </p>
          <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-lg font-black tracking-wide text-cyan-900">
            {doctor?.inviteCode || "Pending"}
          </div>
        </aside>
      </div>
    </section>
  );
}
