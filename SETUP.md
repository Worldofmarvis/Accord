# Setup guide: backend API and AI agent

How to install and run the two server parts of the project:

- **Backend API** (`backend/`): Node.js + Express + Prisma. Talks to the Supabase database, runs the negotiation engine, and handles chat and PayPal payments.
- **AI agent** (`agents/`): Python + FastAPI. Gives the buyer and seller agents their offers.

They are separate programs. Each runs in its own terminal. The backend calls the agent over HTTP. The database is online (Supabase), so there is nothing to install for it.

```
front end (web/)  ->  backend API (port 3000)  ->  AI agent (port 8000)
                              |
                              v
                      Supabase database
```

If the agent is not running, the backend automatically uses its built-in rule-based agent, so the app still works. Start the agent when you want the real AI agent to be used.

## Before you start

| Tool | Version | Check with |
|---|---|---|
| Node.js | 18 or newer | `node --version` |
| Python | 3.10 or newer | `python --version` (on Mac use `python3`) |
| Git | any | `git --version` |

You also need the database connection strings from the database owner. Ask for them privately (never through Git or chat groups).

---

## 1. Backend API

### Install

```
cd backend
npm install
npx prisma generate
```

`prisma generate` only builds the database code on your computer. It does not change the database.

### Settings (`backend/.env`)

Copy `.env.example` to `.env` and fill in the values. **Never commit `.env`.**

| Variable | What it is | Example |
|---|---|---|
| `DATABASE_URL` | Supabase pooler connection, port 6543 | `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase pooler connection, port 5432 | `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres` |
| `AGENT_URL` | Where the AI agent runs. Leave empty to use only the rule-based agent | `http://127.0.0.1:8000` |
| `AGENT_USE_LLM` | `true` lets Gemini word the agent notes. Default `false` | `false` |
| `AGENT_TIMEOUT_MS` | How long to wait for the agent before using the rule-based agent. Default `4000` | `4000` |
| `STEP_MS` | Time between agent offers on the live screen. Default `2500` | `2500` |
| `LOCK_MINUTES` | How long an agreed, unpaid deal locks the seller. Default `10`. Use `1` only while testing | `10` |
| `PORT` | Port of the backend. Default `3000` | `3000` |
| PayPal sandbox keys | See `backend/.env.example` for the exact names | |

Notes:
- Each variable goes on its own line, with no quotes and no spaces around `=`.
- Use the **pooler** addresses (`...pooler.supabase.com`). The direct address (`db.<project>.supabase.co`) is not reachable from many networks.
- The username is `postgres.<project-ref>`, not only `postgres`.
- If the password has special characters (`@ # / : %`), write them URL-encoded (for example `@` becomes `%40`).
- Changes to `.env` only load when the server starts, so restart it after every change.

### Run

```
node server.js
```

You should see `Server running on http://localhost:3000`.

### Check that it works

1. Open `http://localhost:3000/health`. You should see `{"status":"ok"}`.
2. Open `http://localhost:3000/api/users/demo`. You should see a list of users from the database.
3. Open `http://localhost:3000/api/listings`. You should see listings with prices and tags, and **no** `priceFloor`.

### Full test

With the server running, open a second terminal:

```
cd backend
node smoke.js
```

It checks the whole flow: search, creating a request, starting a negotiation, the agents finishing, the privacy rules (buyers never see the seller's floor, sellers never see the buyer's limits), chat, and the price warning in chat.

`smoke.js` leaves one test request and one test negotiation in the shared database. If the deal ends as `agreed`, that seller stays locked until the lock runs out (10 minutes by default). Ask the database owner to run the reset script before a demo.

### Database rules

- The schema is in `backend/prisma/schema.prisma`.
- **Only the database owner changes the database**, with `npx prisma db push`. We do not use migration files.
- Everyone else only runs `npx prisma generate` after pulling schema changes.
- Prices are whole US dollars (integers).

### What is in the backend folder

```
backend/
  server.js        starts the app and connects the route files
  engine.js        the only place a price is accepted (limits and rounds)
  agent.js         asks the AI agent for an offer, with a rule-based backup
  payments.js      PayPal sandbox
  smoke.js         end-to-end test
  lib/             database connection, login by X-User-Id, locks, helpers
  routes/          the API endpoints (search, buyer, seller, negotiations, payments)
  prisma/          the database schema
```

The endpoints are described in `API.md`.

---

## 2. AI agent

### Install

```
cd agents
python -m pip install fastapi uvicorn python-dotenv requests
```

- If the folder has a `requirements.txt`, use `python -m pip install -r requirements.txt` instead.
- Always use `python -m pip` and `python -m uvicorn`. This makes sure the install and the run use the same Python, which matters if your computer has more than one.
- If you see `No module named 'xyz'`, run `python -m pip install xyz`.
- Only if you want Gemini to word the notes: also run `python -m pip install google-genai`.

### Settings (`agents/.env`, optional)

| Variable | What it is |
|---|---|
| `GEMINI_API_KEY` | Only needed when the backend has `AGENT_USE_LLM=true` |
| `NEGOTIATION_MODEL` | Optional Gemini model name |

Keep keys in `.env` and out of Git. The agent never needs PayPal keys for this app, because the backend handles payments.

### Run

```
python -m uvicorn app:app --port 8000
```

You should see `Uvicorn running on http://127.0.0.1:8000`. Leave the terminal open.

### Check that it works

Open `http://localhost:8000/docs`. You should see `/api/negotiate` listed. A `404 Not Found` for `/` or `/favicon.ico` in the terminal is normal.

### Connect it to the backend

1. Put this in `backend/.env`: `AGENT_URL=http://127.0.0.1:8000`
2. Restart `node server.js`.
3. Run `node smoke.js`. If the notes read like "Opening offer of 57 for the full scope.", the AI agent is answering. If they read "Opening below the list price.", the backend is using its rule-based backup.

### How the agent works

- The backend sends the agent only that side's own limits and the offers so far. The other side's limits never leave the backend.
- The agent returns an offer, accept, or reject, with a short note. The engine in the backend still enforces every limit.
- The agent's algorithm sets the prices. Gemini, when switched on, only rewords the note.
- The PayPal routes in `agents/app.py` are not used by the app.

### Tests

```
python -m pip install pytest
python -m pytest -q test_negotiation_agent.py test_paypal_checkout.py
```

---

## 3. Run everything

Open one terminal per part and keep them open.

| Terminal | Folder | Command | Needed? |
|---|---|---|---|
| 1 | `agents` | `python -m uvicorn app:app --port 8000` | Optional (rule-based backup if it is off) |
| 2 | `backend` | `node server.js` | Required |
| 3 | `web` | `npm run dev` | Required |

Then open `http://localhost:5173`.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find module '...smoke.js'` | You are in the wrong folder. Run `cd backend` first. |
| `P1001: Can't reach database server` | Use the pooler connection strings, not the `db.<project>.supabase.co` address. |
| `@prisma/client did not initialize yet` | Run `npx prisma generate` in `backend`. |
| `Drift detected` from Prisma | Answer **No** to any reset question. The database owner uses `npx prisma db push` instead. |
| Notes still say "Opening below the list price." | The agent is not being used. Check that the agent terminal is running, `AGENT_URL=http://127.0.0.1:8000` is in `backend/.env`, and you restarted the backend. Look for `agent failed` in the backend terminal. |
| `No module named 'dotenv'` (or another module) | `python -m pip install python-dotenv` (or the name shown). |
| "there is an unlocked listing to test with" fails | The seller is locked by an unpaid deal. Wait 10 minutes, set `LOCK_MINUTES=1` while testing, or ask the database owner to reset. |
| Port already in use | Close the old terminal that is still running the server, or change `PORT`. |
| `.env` change has no effect | Restart the server. `.env` is only read at start. |

## Security rules

- Never commit `.env` files or paste real keys and passwords in chats or issues.
- The agent receives private limits, so only the backend should call it. Never call it from the browser, and do not put it on a public address without protection.
- The backend decides every price. Chat messages are text only and never change a price.
