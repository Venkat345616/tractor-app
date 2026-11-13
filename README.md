# Tractor app: Postgres + Node + React

## 1. Database (PostgreSQL)
```bash
createdb tractor
psql tractor -f db/schema.sql      # creates tables
psql tractor -f db/seed.sql        # imports your Excel data (31 farmers, 184 jobs, 41 expenses)
```
Check: `psql tractor -c "SELECT SUM(amount) FROM jobs;"` should print 597350.

## 2. Backend (Node)
```bash
cd server
npm install
cp .env.example .env     # set DATABASE_URL
npm run dev              # http://localhost:5000/api/health
```

## 3. Frontend (React)
```bash
cd client
npm install
npm run dev          # http://localhost:5173  (calls the API on port 5000 automatically)
```
Screens:
1. **Register Farmer**: name, phone, village. After saving, tap "Add data for this farmer".
2. **Add Data**: select the farmer, then choose **Cultivation** (type + acres) or **Tholakam** (trips + price per trip). Only the chosen category's inputs are shown. The amount is calculated live and saved by the server.

## API
| Method | Path | Purpose |
|---|---|---|
| GET/POST | /api/farmers | list (with billed/paid/balance) / register |
| GET | /api/farmers/:id/statement | jobs, payments, balance for one farmer |
| GET/POST | /api/jobs | list / add job (salu 750, madaka 1500, rotor 1500 automatic; tholakam needs `rate` = price per trip) |
| DELETE | /api/jobs/:id | remove a wrong entry |
| POST | /api/payments | record money received from a farmer |
| GET/POST | /api/expenses | diesel / parts / other |
| GET | /api/summary | billed, received, outstanding, expenses, net |

Example add job:
```json
POST /api/jobs
{ "farmerId": 3, "jobType": "salu", "quantity": 3.75 }
{ "farmerId": 3, "jobType": "tholakam", "quantity": 4, "rate": 600 }
```
