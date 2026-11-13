import { useCallback, useEffect, useState } from "react";
import { addJob, deleteJob, getFarmers, getJobs, updateJob } from "../api.js";

// Fixed per-acre rates (the server applies the same rates when saving)
const RATES = { salu: 750, madaka: 1500, rotor: 1500 };
const CULTIVATION_TYPES = [
  ["salu", "Salu (సాలు)"],
  ["madaka", "Madaka (మడక)"],
  ["rotor", "Rotor (రోటర్)"],
];
const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export default function AddData({ farmerId, setFarmerId }) {
  const [farmers, setFarmers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [editingId, setEditingId] = useState(null); // null = adding a new entry

  const [date, setDate] = useState(today());
  const [category, setCategory] = useState("cultivation"); // "cultivation" | "tholakam"

  // cultivation inputs
  const [cultType, setCultType] = useState("salu");
  const [acres, setAcres] = useState("");
  // tholakam inputs
  const [trips, setTrips] = useState("");
  const [tripPrice, setTripPrice] = useState("");

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFarmers().then(setFarmers).catch((e) => setError(e.message));
  }, []);

  const loadJobs = useCallback(() => {
    if (!farmerId) return setJobs([]);
    getJobs(farmerId).then(setJobs).catch((e) => setError(e.message));
  }, [farmerId]);
  useEffect(loadJobs, [loadJobs]);

  const amount =
    category === "cultivation"
      ? Number(acres || 0) * RATES[cultType]
      : Number(trips || 0) * Number(tripPrice || 0);

  const clearInputs = () => {
    setAcres("");
    setTrips("");
    setTripPrice("");
  };

  const startEdit = (j) => {
    setError("");
    setMsg("");
    setEditingId(j.id);
    setDate(String(j.job_date).slice(0, 10));
    if (j.job_type === "tholakam") {
      setCategory("tholakam");
      setTrips(String(j.quantity));
      setTripPrice(String(j.rate));
    } else {
      setCategory("cultivation");
      setCultType(j.job_type);
      setAcres(String(j.quantity));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    clearInputs();
    setDate(today());
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!farmerId) return setError("Select a farmer first");

    const body =
      category === "cultivation"
        ? { farmerId: Number(farmerId), jobDate: date, jobType: cultType, quantity: Number(acres) }
        : {
            farmerId: Number(farmerId),
            jobDate: date,
            jobType: "tholakam",
            quantity: Number(trips),
            rate: Number(tripPrice),
          };

    setSaving(true);
    try {
      if (editingId) {
        await updateJob(editingId, body);
        setMsg(`Updated: ${money(amount)}`);
        setEditingId(null);
        setDate(today());
      } else {
        await addJob(body);
        setMsg(`Saved: ${money(amount)}`);
      }
      clearInputs();
      loadJobs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    await deleteJob(id).catch((e) => setError(e.message));
    if (editingId === id) cancelEdit();
    loadJobs();
  };

  const farmer = farmers.find((f) => String(f.id) === String(farmerId));
  const label = { salu: "Salu", madaka: "Madaka", rotor: "Rotor", tholakam: "Tholakam", other: "Other" };

  return (
    <>
      <section className={editingId ? "card editing" : "card"}>
        <h2>{editingId ? "Edit entry" : "Add Data"}</h2>
        <form onSubmit={submit}>
          <label>
            Select farmer *
            <select
              value={farmerId}
              onChange={(e) => setFarmerId(e.target.value)}
              disabled={!!editingId}
              required
            >
              <option value="">-- choose --</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <div className="choice">
            <button
              type="button"
              className={category === "cultivation" ? "pill active" : "pill"}
              onClick={() => setCategory("cultivation")}
            >
              Cultivation
            </button>
            <button
              type="button"
              className={category === "tholakam" ? "pill active" : "pill"}
              onClick={() => setCategory("tholakam")}
            >
              Tholakam (తోలకం)
            </button>
          </div>

          {/* Only the selected category's inputs are shown */}
          {category === "cultivation" ? (
            <>
              <label>
                Cultivation type
                <select value={cultType} onChange={(e) => setCultType(e.target.value)}>
                  {CULTIVATION_TYPES.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text} – {money(RATES[value])}/acre
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Acres *
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  value={acres}
                  onChange={(e) => setAcres(e.target.value)}
                  required
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Number of trips *
                <input
                  type="number"
                  step="1"
                  min="1"
                  inputMode="numeric"
                  value={trips}
                  onChange={(e) => setTrips(e.target.value)}
                  required
                />
              </label>
              <label>
                Price per trip (₹) *
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={tripPrice}
                  onChange={(e) => setTripPrice(e.target.value)}
                  required
                />
              </label>
            </>
          )}

          <p className="total">Amount: {money(amount)}</p>
          <div className="actions">
            <button className="primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {error && <p className="msg error">{error}</p>}
        {msg && <p className="msg ok">{msg}</p>}
      </section>

      {farmer && (
        <section className="card">
          <h2>{farmer.name} – entries</h2>
          {jobs.length === 0 ? (
            <p>No entries yet.</p>
          ) : (
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className={j.id === editingId ? "row-editing" : ""}>
                      <td>{fmtDate(j.job_date)}</td>
                      <td>{label[j.job_type]}</td>
                      <td>{j.quantity}</td>
                      <td>{j.rate}</td>
                      <td>{money(j.amount)}</td>
                      <td>
                        {j.job_type !== "other" && (
                          <button className="link" onClick={() => startEdit(j)}>
                            Edit
                          </button>
                        )}{" "}
                        <button className="link danger" onClick={() => remove(j.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4">Total</td>
                    <td colSpan="2">{money(jobs.reduce((s, j) => s + j.amount, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}