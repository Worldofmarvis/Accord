# Setup guide: backend API and AI agent

How to install and run the three parts of the project:

- **Backend API** (`backend/`): Node.js + Express + Prisma. Talks to the Supabase database, runs the negotiation engine, and handles chat and PayPal payments.
- **AI agent** (`agents/`): Python + FastAPI. Gives the buyer and seller agents their offers.
- **Web front end** (`web/`): React + Vite. The screens. It only talks to the backend API, never to the database or the agent.

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

## Quick start for a new teammate

Follow these in order. Each step points to the section with the details.

1. Pull the latest code.
2. Create three `.env` files by copying each `.env.example` (`cp .env.example .env` in Git Bash, `copy .env.example .env` in PowerShell). **Never commit them.**
   - `backend/.env`: the database strings from the database owner (privately), the PayPal sandbox keys (or leave them empty for mock payments), `AGENT_URL=http://127.0.0.1:8000`, `LOCK_MINUTES=10`. See section 1.
   - `web/.env`: `VITE_USE_MOCK=false`, `VITE_API_URL=/api`, `API_PROXY_TARGET=http://localhost:3000`, and the public `VITE_PAYPAL_CLIENT_ID`. See section 3.
   - `agents/.env`: optional. See section 2.
3. Install: `npm install` and `npx prisma generate` in `backend`, `npm install` in `web`, and the Python packages in `agents` if you want the AI agent.
4. Start the agent (optional), then the backend, then the web app. See section 4.
5. Get the user ids from `http://localhost:3000/api/users/demo` and open `http://localhost:5173/?as=<user id>`, one tab per person. See section 3.
6. For payments, log in to PayPal with the **Personal** sandbox account. See section 5.

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

Create your own `.env` from the template. **Never commit `.env`.** Only `.env.example` is committed, and it must never hold real values.

1. In the `backend` folder, copy `.env.example` to a new file named `.env`:
   - Git Bash, Mac or Linux: `cp .env.example .env`
   - PowerShell: `copy .env.example .env`
2. Open `.env` and fill in the values below. Your file should end up looking like this (placeholders in `<...>`):

```
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
AGENT_URL=http://127.0.0.1:8000
AGENT_USE_LLM=false
AGENT_TIMEOUT_MS=4000
STEP_MS=2500
LOCK_MINUTES=10
PORT=3000
PAYPAL_CLIENT_ID=<sandbox client id>
PAYPAL_CLIENT_SECRET=<sandbox secret>
```

3. Get the two database strings and the password from the database owner, privately.
4. Get the PayPal values from the PayPal Developer Dashboard, under Apps & Credentials, in **Sandbox** mode, from the app linked to the **business** sandbox account. If the two PayPal lines are empty, payments run in a built-in mock mode and nothing reaches PayPal.

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
| `PAYPAL_CLIENT_ID` | Sandbox client ID of the PayPal app. Also goes in `web/.env` as `VITE_PAYPAL_CLIENT_ID` | |
| `PAYPAL_CLIENT_SECRET` | Sandbox secret of the same app. **Backend only**: never put it in `web/.env` or Git | |

Check `backend/.env.example` for any other variables the backend reads.

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
4. To test who is calling, send a user id (from step 2) in the `X-User-Id` header. Use `curl.exe` in PowerShell or `curl` in Git Bash:
   `curl -H "X-User-Id: <user id>" http://localhost:3000/api/me`. You should get that user's `id`, `name` and `roles`. Without the header you get `401 UNAUTHENTICATED`.

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
- The `DealApproval` table (both people approve the agreed price before payment) was added with `db push`. After pulling, run `npx prisma generate`.

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

## 3. Web front end

### Install

```
cd web
npm install
```

### Settings (`web/.env`)

Vite reads only a file named `.env`, never `.env.example`, so copy it first (`cp .env.example .env` in Git Bash, `copy .env.example .env` in PowerShell). **Never commit `.env`.**

| Variable | What it is | Value |
|---|---|---|
| `VITE_USE_MOCK` | `false` uses the real backend. `true` uses built-in demo data | `false` |
| `VITE_API_URL` | Where the API lives. Keep it as `/api` so Vite forwards the calls and no CORS is needed | `/api` |
| `API_PROXY_TARGET` | Development only: the address of the backend | `http://localhost:3000` |
| `VITE_POLL_MS` | How often the screens ask for updates | `3000` |
| `VITE_PAYPAL_CLIENT_ID` | The **public** sandbox client ID, the same PayPal app as the backend. Never the secret | `<sandbox client id>` |

If `VITE_PAYPAL_CLIENT_ID` is empty, everything works except the PayPal button. Restart `npm run dev` after every change to `.env`.

### Run

```
npm run dev
```

Open the address it prints (usually `http://localhost:5173`).

### Who is signed in (demo)

There is no login screen. The backend identifies the caller by an `X-User-Id` header, which the front end sends on every request. The user id lives in the browser tab, so each tab is its own person.

1. Open `http://localhost:3000/api/users/demo` and copy the `id` of a buyer and of a seller. These ids are different in every database, so do not copy them from other people's notes.
2. Open one tab with `http://localhost:5173/?as=<buyer id>` and another tab with `http://localhost:5173/?as=<seller id>`.
3. The header shows the name and a BUYER or SELLER badge. If it does not, the id is wrong.

A tab opened without `?as=` depends on `web/src/api/real.ts`. The current `real.ts` signs it in as the first user from `/api/users/demo`. The original `real.ts` calls `/api/me` instead, which answers `401 Not signed in` when there is no id, and the page shows "Please sign in to continue".

To open a negotiation as the other person, keep the same negotiation id and change only the `?as=` part, for example `http://localhost:5173/negotiations/<negotiation id>/pay?as=<seller id>`.

---

## 4. Run everything

Open one terminal per part and keep them open.

| Terminal | Folder | Command | Needed? |
|---|---|---|---|
| 1 | `agents` | `python -m uvicorn app:app --port 8000` | Optional (rule-based backup if it is off) |
| 2 | `backend` | `node server.js` | Required |
| 3 | `web` | `npm run dev` | Required |

Then open `http://localhost:5173/?as=<user id>` (see section 3 for where to get the id).

## 5. PayPal sandbox accounts

Payments only run in the PayPal **sandbox**: no real money moves.

- In the PayPal Developer Dashboard, under Testing Tools, Sandbox Accounts, you need two accounts: a **Business** account (the seller, which receives the money and is tied to the app keys) and a **Personal** account (the buyer, which pays). Create the Personal one with **Create account** if it is missing.
- When the PayPal window opens on the pay screen, log in with the **Personal** account. PayPal refuses the Business account with "You are logging into the account of the seller".
- To see the payment, log in at `https://www.sandbox.paypal.com` with the Business account and open Activity.
- Payment is locked until **both** people approve the agreed price. The buyer and the seller each approve on `/negotiations/<id>/pay`.

## 6. API status

`API.md` is the contract. This is what the backend answers today:

- **Built:** `/api/me`, `/api/users/demo`, `/api/listings`, the buyer and seller dashboard routes (`/buyer/requests`, `/buyer/negotiations`, `/seller/listings`, `/seller/active-negotiation`), `/negotiations/:id` with `/messages` and `/outcome`, the approval routes (`/approval`, `/approval/approve`, `/approval/decline`), and the payment routes (`GET /payment`, `POST /payment/order`, `POST /payment/capture`),`GET /api/requests`, `GET /seller/sales` and `GET /seller/negotiations`.
- **Not built yet:**  the `/api/proposals` routes.
- **Not in `API.md`:** `POST /negotiations` (the buyer starts a negotiation directly, with no proposal) and `GET /payments/config`.

**How `web/src/api/real.ts` handles the missing routes.** It is an adapter for the backend as it is today:

- The **Negotiate** button calls `POST /negotiations`, so a negotiation starts straight away instead of waiting for a proposal.
- Find customers, Proposals, My negotiations and Sales history show **empty lists**, because their routes do not exist. Accepting, declining or withdrawing a proposal shows an "isn't available in this version" error.
- `/api/users/demo` is used to sign in, and `getMe` falls back to the first demo user.

When those routes are built, replace the matching stubs in `real.ts` with the real calls from `API.md`. The earlier version of `real.ts`, which calls every contract route, is in the Git history.

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
| `.env` change in `web` has no effect | Vite reads only `web/.env`, not `.env.example`. Create the file, then restart `npm run dev`. |
| `Please sign in to continue`, or the wrong user is shown | The tab has no user id. Open `http://localhost:5173/?as=<user id>` with an id from `/api/users/demo`. |
| `Failed to resolve import "ag-studio-react"` | Run `npm install` in `web`, then restart `npm run dev`. |
| `P1001` now and then, or `Something went wrong` on the first request | The free database can drop the first connection after a pause. Retry once. If it keeps failing, check that the Supabase project is not paused, try a phone hotspot, and ask the database owner to check Network Bans. |
| Prisma says `dealApproval` is undefined | Run `npx prisma generate` in `backend`. If the table is missing, the database owner runs `npx prisma db push`. |
| The buyer's PayPal button stays locked | Both people must approve first. The seller opens `/negotiations/<id>/pay` and clicks Approve. |
| PayPal says `You are logging into the account of the seller` | You used the Business sandbox account. Log in with the Personal one. |
| PayPal keeps returning to `Continue to Review Order` | Pay with the PayPal balance instead of the saved card, use a fresh Personal sandbox account, and test in a private window with extensions off. |
| Listings, or a `Smoke test request`, that nobody on the team added | They are shared test data in the database, left by testing and by `smoke.js`. Do not delete them by hand: negotiations, offers and payments point to them. Ask the database owner to run the reset script. |
| `agent failed` in the backend terminal | The agent is not reachable. Start it, and try `AGENT_URL=http://127.0.0.1:8000` instead of `localhost` in `backend/.env`. Until then the backend uses its rule-based agent. |

## Security rules

- Never commit `.env` files or paste real keys and passwords in chats or issues.
- The agent receives private limits, so only the backend should call it. Never call it from the browser, and do not put it on a public address without protection.
- The backend decides every price. Chat messages are text only and never change a price.
- If a password or key is ever pasted somewhere public, reset it right away (Supabase: Project Settings, Database, Reset database password) and share the new one privately with the team.
- The `X-User-Id` sign-in is for the demo only. Anyone who knows a user id can act as that user, so it must not be used for real accounts.
