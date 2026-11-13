import { useEffect, useState } from "react";
import { addFarmer, getFarmers } from "../api.js";

export default function RegisterFarmer({ onAddData }) {
  const [form, setForm] = useState({ name: "", phone: "", village: "" });
  const [farmers, setFarmers] = useState([]);
  const [saved, setSaved] = useState(null); // the farmer just registered
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => getFarmers().then(setFarmers).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(null);
    setSaving(true);
    try {
      const farmer = await addFarmer(form);
      setSaved(farmer);
      setForm({ name: "", phone: "", village: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="card">
        <h2>Register a Farmer</h2>
        <form onSubmit={submit}>
          <label>
            Farmer name *
            <input name="name" value={form.name} onChange={change} required />
          </label>
          <label>
            Phone number
            <input name="phone" value={form.phone} onChange={change} inputMode="tel" />
          </label>
          <label>
            Village
            <input name="village" value={form.village} onChange={change} />
          </label>
          <button className="primary" disabled={saving}>
            {saving ? "Saving..." : "Register Farmer"}
          </button>
        </form>

        {error && <p className="msg error">{error}</p>}
        {saved && (
          <p className="msg ok">
            {saved.name} registered.{" "}
            <button className="link" onClick={() => onAddData(saved.id)}>
              Add data for this farmer →
            </button>
          </p>
        )}
      </section>

      <section className="card">
        <h2>Registered farmers ({farmers.length})</h2>
        <ul className="list">
          {farmers.map((f) => (
            <li key={f.id}>
              <span>
                <strong>{f.name}</strong>
                {(f.village || f.phone) && (
                  <small> {[f.village, f.phone].filter(Boolean).join(" · ")}</small>
                )}
              </span>
              <button className="link" onClick={() => onAddData(f.id)}>
                Add data
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
