import { useEffect, useState } from "react";
import { Eye, EyeOff, User } from "lucide-react";

function ProfileIcon() {
  return <User aria-hidden="true" size={20} className="stroke-current" />;
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.75a4.5 4.5 0 1 0-9 0v2.75" />
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v2" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.75h10a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5h5M9.5 12h5M9.5 14.5h3" />
    </svg>
  );
}

// Use Lucide React icons for smaller bundle and consistent look

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
  const [passwordVisible, setPasswordVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";
  const labelClass = "text-sm font-semibold text-slate-700";

  const togglePasswordVisibility = (field) => {
    setPasswordVisible((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

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
    <section className="mx-auto w-full max-w-[1400px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_22px_60px_-28px_rgba(15,23,42,0.5)] backdrop-blur-md">
      <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-500/30">
              <ProfileIcon />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Profile</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Doctor profile settings
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                Update your account details, keep your doctor identity current, and manage your password from one place.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm lg:self-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
              <BadgeIcon />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Doctor code</p>
              <p className="font-mono text-sm font-black tracking-wider text-slate-900">
                {doctor?.inviteCode || "Pending"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-5 py-5 sm:px-6">
        <div className="grid gap-5">
          <form
            className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)]"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <ProfileIcon />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Personal information</h3>
                <p className="text-sm text-slate-500">Keep your name, email, and specialization up to date.</p>
              </div>
            </div>

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
                className="inline-flex items-center gap-2 rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>

          <form
            className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)]"
            onSubmit={handlePasswordSubmit}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <LockIcon />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Change password</h3>
                <p className="text-sm text-slate-500">Use a strong password that you do not reuse elsewhere.</p>
              </div>
            </div>

            <label className={labelClass}>
              Current password
              <div className="relative mt-2">
                <input
                  autoComplete="current-password"
                  className={`${inputClass} pr-12`}
                  maxLength={72}
                  minLength={8}
                  name="currentPassword"
                  onChange={updatePasswordField}
                  required
                  type={passwordVisible.currentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                />
                <button
                  aria-label={passwordVisible.currentPassword ? "Hide current password" : "Show current password"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-slate-800"
                  onClick={() => togglePasswordVisibility("currentPassword")}
                  type="button"
                >
                  {passwordVisible.currentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className={labelClass}>
              New password
              <div className="relative mt-2">
                <input
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                  maxLength={72}
                  minLength={8}
                  name="newPassword"
                  onChange={updatePasswordField}
                  required
                  type={passwordVisible.newPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                />
                <button
                  aria-label={passwordVisible.newPassword ? "Hide new password" : "Show new password"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-slate-800"
                  onClick={() => togglePasswordVisibility("newPassword")}
                  type="button"
                >
                  {passwordVisible.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="mt-1 block text-xs font-medium text-slate-500">
                Password must be 8 to 72 characters.
              </span>
            </label>

            <label className={labelClass}>
              Confirm new password
              <div className="relative mt-2">
                <input
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                  maxLength={72}
                  minLength={8}
                  name="confirmPassword"
                  onChange={updatePasswordField}
                  required
                  type={passwordVisible.confirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                />
                <button
                  aria-label={passwordVisible.confirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-slate-800"
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                  type="button"
                >
                  {passwordVisible.confirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
                className="inline-flex items-center gap-2 rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingPassword}
                type="submit"
              >
                {savingPassword ? "Saving..." : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
