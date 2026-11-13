import express from "express";
import cors from "cors";
import "dotenv/config";
import { pool } from "./db.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

// Fixed per-acre rates. tholakam has no fixed rate: price per trip is typed each time.
const FIXED_RATES = { salu: 750, madaka: 1500, rotor: 1500 };
const JOB_TYPES = ["salu", "madaka", "rotor", "tholakam", "other"];

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error(e);
    res.status(e.status || 500).json({ error: e.status ? e.message : "Server error" });
  });
const bad = (msg) => Object.assign(new Error(msg), { status: 400 });

// ---------- Farmers ----------
app.get("/api/farmers", wrap(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT f.id, f.name, f.phone, f.village,
           COALESCE(j.billed, 0) AS billed,
           COALESCE(p.paid, 0)   AS paid,
           COALESCE(j.billed, 0) - COALESCE(p.paid, 0) AS balance
    FROM farmers f
    LEFT JOIN (SELECT farmer_id, SUM(amount) billed FROM jobs GROUP BY farmer_id) j ON j.farmer_id = f.id
    LEFT JOIN (SELECT farmer_id, SUM(amount) paid FROM payments GROUP BY farmer_id) p ON p.farmer_id = f.id
    ORDER BY f.name`);
  res.json(rows);
}));

app.post("/api/farmers", wrap(async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) throw bad("Name is required");
  const { rows } = await pool.query(
    `INSERT INTO farmers(name, phone, village) VALUES ($1,$2,$3) RETURNING *`,
    [name, req.body.phone || null, req.body.village || null]
  ).catch((e) => { if (e.code === "23505") throw bad("This farmer already exists"); throw e; });
  res.status(201).json(rows[0]);
}));

// Per-farmer statement: jobs, payments, balance
app.get("/api/farmers/:id/statement", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const farmer = (await pool.query(`SELECT * FROM farmers WHERE id=$1`, [id])).rows[0];
  if (!farmer) throw Object.assign(new Error("Farmer not found"), { status: 404 });
  const jobs = (await pool.query(`SELECT * FROM jobs WHERE farmer_id=$1 ORDER BY job_date, id`, [id])).rows;
  const payments = (await pool.query(`SELECT * FROM payments WHERE farmer_id=$1 ORDER BY paid_on, id`, [id])).rows;
  const billed = jobs.reduce((s, j) => s + j.amount, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  res.json({ farmer, jobs, payments, billed, paid, balance: billed - paid });
}));

// ---------- Jobs ----------
app.get("/api/jobs", wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT j.*, f.name AS farmer_name FROM jobs j JOIN farmers f ON f.id = j.farmer_id
     WHERE ($1::int IS NULL OR j.farmer_id = $1)
     ORDER BY j.job_date DESC, j.id DESC`,
    [req.query.farmerId ? Number(req.query.farmerId) : null]
  );
  res.json(rows);
}));

// Validates a job body and works out the rate; used by both add and edit
function parseJob(body) {
  const { farmerId, jobDate, jobType, quantity, notes } = body;
  if (!JOB_TYPES.includes(jobType)) throw bad("Invalid job type");
  const qty = Number(quantity);
  if (!farmerId || !(qty > 0)) throw bad("Farmer and a quantity above 0 are required");
  // fixed types use the standard rate; tholakam/other must supply a rate
  const rate = FIXED_RATES[jobType] ?? Number(body.rate);
  if (!(rate >= 0) || Number.isNaN(rate)) throw bad("Rate (price per trip) is required for " + jobType);
  return { farmerId, jobDate: jobDate || null, jobType, qty, rate, notes: notes || null };
}

app.post("/api/jobs", wrap(async (req, res) => {
  const j = parseJob(req.body);
  const { rows } = await pool.query(
    `INSERT INTO jobs(farmer_id, job_date, job_type, quantity, rate, notes)
     VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6) RETURNING *`,
    [j.farmerId, j.jobDate, j.jobType, j.qty, j.rate, j.notes]
  );
  res.status(201).json(rows[0]);
}));

// Edit an existing entry (amount is recalculated automatically by the database)
app.put("/api/jobs/:id", wrap(async (req, res) => {
  const j = parseJob(req.body);
  const { rows } = await pool.query(
    `UPDATE jobs SET farmer_id=$1, job_date=COALESCE($2::date, job_date),
            job_type=$3, quantity=$4, rate=$5, notes=$6
     WHERE id=$7 RETURNING *`,
    [j.farmerId, j.jobDate, j.jobType, j.qty, j.rate, j.notes, Number(req.params.id)]
  );
  if (!rows[0]) throw Object.assign(new Error("Entry not found"), { status: 404 });
  res.json(rows[0]);
}));

app.delete("/api/jobs/:id", wrap(async (req, res) => {
  await pool.query(`DELETE FROM jobs WHERE id=$1`, [Number(req.params.id)]);
  res.status(204).end();
}));

// ---------- Payments received ----------
app.post("/api/payments", wrap(async (req, res) => {
  const { farmerId, paidOn, amount, note } = req.body;
  if (!farmerId || !(Number(amount) > 0)) throw bad("Farmer and an amount above 0 are required");
  const { rows } = await pool.query(
    `INSERT INTO payments(farmer_id, paid_on, amount, note)
     VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4) RETURNING *`,
    [farmerId, paidOn || null, Number(amount), note || null]
  );
  res.status(201).json(rows[0]);
}));

// ---------- Expenses ----------
app.get("/api/expenses", wrap(async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM expenses ORDER BY expense_date DESC NULLS LAST, id DESC`);
  res.json(rows);
}));

app.post("/api/expenses", wrap(async (req, res) => {
  const { expenseDate, category, details, amount } = req.body;
  if (!["diesel", "parts", "other"].includes(category)) throw bad("Invalid category");
  if (!details || Number.isNaN(Number(amount))) throw bad("Details and amount are required");
  const { rows } = await pool.query(
    `INSERT INTO expenses(expense_date, category, details, amount)
     VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3, $4) RETURNING *`,
    [expenseDate || null, category, details, Number(amount)]
  );
  res.status(201).json(rows[0]);
}));

// ---------- Dashboard: replaces the old "total" tab ----------
app.get("/api/summary", wrap(async (_req, res) => {
  const income = (await pool.query(`SELECT COALESCE(SUM(amount),0) AS v FROM jobs`)).rows[0].v;
  const received = (await pool.query(`SELECT COALESCE(SUM(amount),0) AS v FROM payments`)).rows[0].v;
  const byType = (await pool.query(
    `SELECT job_type, SUM(quantity) AS quantity, SUM(amount) AS amount FROM jobs GROUP BY job_type ORDER BY amount DESC`)).rows;
  const byCategory = (await pool.query(
    `SELECT category, SUM(amount) AS amount FROM expenses GROUP BY category`)).rows;
  const expenses = byCategory.reduce((s, r) => s + r.amount, 0);
  res.json({
    billed: income, received, outstanding: income - received,
    expenses, byCategory, byType,
    net: income - expenses
  });
}));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on port ${port}`));