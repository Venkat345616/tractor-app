-- Tractor business database (PostgreSQL)
CREATE TABLE IF NOT EXISTS farmers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  phone       TEXT,
  village     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- quantity = acres (salu/madaka/rotor) or trips (tholakam); amount is always quantity * rate
CREATE TABLE IF NOT EXISTS jobs (
  id         SERIAL PRIMARY KEY,
  farmer_id  INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  job_date   DATE NOT NULL,
  job_type   TEXT NOT NULL CHECK (job_type IN ('salu','madaka','rotor','tholakam','other')),
  quantity   NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  rate       NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
  amount     NUMERIC(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_farmer_idx ON jobs(farmer_id);
CREATE INDEX IF NOT EXISTS jobs_date_idx ON jobs(job_date);

-- money received from farmers (the old sheet had no payment records)
CREATE TABLE IF NOT EXISTS payments (
  id         SERIAL PRIMARY KEY,
  farmer_id  INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  paid_on    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note       TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id           SERIAL PRIMARY KEY,
  expense_date DATE,
  category     TEXT NOT NULL CHECK (category IN ('diesel','parts','other')),
  details      TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL
);
