# Setup guide: backend API, AI agent and web app

How to install and run the three parts of the project:

- **Backend API** (`backend/`): Node.js + Express + Prisma. Talks to the Supabase database, runs the negotiation engine, and handles proposals, chat, approval and PayPal payments.
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
2. Create the `.env` files by copying each `.env.example` (`cp .env.example .env` in Git Bash, `copy .env.example .env` in PowerShell). **Never commit them.**
   - `backend/.env`: the database strings from the database owner (privately), the PayPal sandbox keys (or leave them empty for mock payments), `AGENT_URL=http://127.0.0.1:8000`, `LOCK_MINUTES=10`. See section 1.
   - `web/.env`: `VITE_USE_MOCK=false`, `VITE_API_URL=/api`, `API_PROXY_TARGET=http://localhost:3000`, and the public `VITE_PAYPAL_CLIENT_ID`. See section 3.
   - `agents/.env`: optional. See section 2.
3. Install: `npm install` in the repo root (this installs the one-command runner), `npm install` and `npx prisma generate` in `backend`, `npm install` in `web`, and the Python packages in `agents` if you want the AI agent.
4. Start everything with one command: `npm run dev` in the repo root. Or start the three parts one by one. See section 4.
5. Open `http://localhost:5173/` in a browser tab and choose **Alice Seller** or **Bob Buyer**. Open a second tab to be the other person. See section 3.
6. Run the demo flow once (section 5) to check everything is connected.
7. For payments, log in to PayPal with the **Personal** sandbox account. See section 6.

---

## 1. Backend API

### Install

```
cd backend
npm install
npx prisma generate
```

`prisma generate` only builds the database code on your computer. It does not change the database. Run `npm install` again after pulling, because new packages are added from time to time (for example `express-rate-limit`).

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
2. Open `http://localhost:3000/api/users/demo`. You should see a list of users from the database (Alice Seller and Bob Buyer).
3. Open `http://localhost:3000/api/listings`. You should see listings with prices and tags, and **no** `priceFloor`.
4. To test who is calling, send a user id (from step 2) in the `X-User-Id` header. Use `curl.exe` in PowerShell or `curl` in Git Bash:
   `curl -H "X-User-Id: <user id>" http://localhost:3000/api/me`. You should get that user's `id`, `name` and `roles`. Without the header you get `401 UNAUTHENTICATED`.

### Request logging and rate limits

- The backend prints one line per request that changes something or fails (time, method, path, status, duration). Successful reads are not printed, because the screens poll every 3 seconds. Headers and bodies are never logged, so user ids and keys stay out of the log.
- Limits per client and per minute: 1200 requests in general (normal use never reaches it), 30 chat messages, and 20 payment calls. Over a limit the API answers `429` with the code `RATE_LIMITED` and a readable message.

### Database rules

- The schema is in `backend/prisma/schema.prisma`.
- **Only the database owner changes the database.** Everyone else only runs `npx prisma generate` after pulling schema changes. If your backend needs a new table or column, send the model text to the database owner instead of changing the database yourself.
- Keep your local `schema.prisma` identical to the database owner's copy.
- Prices are whole US dollars (integers).
- The seed and reset scripts belong to the database owner. Ask her for the commands, and have her run the reset right before demo rehearsals, once everyone has stopped testing.
- After a re-seed the demo user ids change. Open `/api/users/demo` for the current ones.

### What is in the backend folder

```
backend/
  server.js        starts the app, request logging, rate limits, connects the route files
  engine.js        the only place a price is accepted (limits and rounds)
  agent.js         asks the AI agent for an offer, with a rule-based backup
  payments.js      PayPal sandbox
  lib/             database connection, login by X-User-Id, locks, helpers
  routes/          the API endpoints:
    public.js        demo users, /me, listing search
    buyer.js         buyer requests and negotiations
    seller.js        seller listings, open requests, negotiations, sales history
    proposals.js     send, list, accept, decline and withdraw proposals
    negotiations.js  live view, outcome and rematches, chat
    approval.js      both people approve the agreed price
    payments.js      create and capture the PayPal order
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
3. Start a negotiation (section 5). If the offer notes read like "Opening offer of 57 for the full scope.", the AI agent is answering. If they read "Opening below the list price.", the backend is using its rule-based backup.

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

This also installs AG Grid (`ag-grid-community` and `ag-grid-react`), which the sales history screen uses.

### Settings (`web/.env`)

Vite reads only a file named `.env`, never `.env.example`, so copy it first (`cp .env.example .env` in Git Bash, `copy .env.example .env` in PowerShell). **Never commit `.env`.**

| Variable | What it is | Value |
|---|---|---|
| `VITE_USE_MOCK` | `false` uses the real backend. `true` uses built-in demo data | `false` |
| `VITE_API_URL` | Where the API lives. Keep it as `/api` so Vite forwards the calls and no CORS is needed | `/api` |
| `API_PROXY_TARGET` | Development only: the address of the backend | `http://localhost:3000` |
| `VITE_POLL_MS` | How often the screens ask for updates | `3000` |
| `VITE_PAYPAL_CLIENT_ID` | The **public** sandbox client ID, the same PayPal app as the backend. Never the secret | `<sandbox client id>` |
| `VITE_AG_STUDIO_LICENSE` | Optional licence key for the AG Studio grid. Empty is fine: the grid works with a watermark | |

If `VITE_PAYPAL_CLIENT_ID` is empty, everything works except the PayPal button. Restart `npm run dev` after every change to `.env`.

### Run

```
npm run dev
```

Open the address it prints (usually `http://localhost:5173`).

### Who is signed in (demo)

There is no real login. The backend identifies the caller by an `X-User-Id` header, which the front end sends on every request. The user id lives in the browser tab, so each tab is its own person.

1. Open `http://localhost:5173/` in a new tab. With nobody signed in, the app shows **Choose who you are**, with one button for each demo user: **Alice Seller** (seller) and **Bob Buyer** (buyer).
2. Click one. The header then shows the name and a BUYER or SELLER badge.
3. Open another tab and choose the other person, to be a buyer and a seller at the same time.

You can also skip the chooser by adding the user id to the address: `http://localhost:5173/?as=<user id>`. Get the ids from `http://localhost:3000/api/users/demo`. They are different in every database, and they change after a re-seed, so do not copy them from other people's notes.

To open a negotiation as the other person, keep the same negotiation id and change only the `?as=` part, for example `http://localhost:5173/negotiations/<negotiation id>/pay?as=<seller id>`.

---

## 4. Run everything

```
Accord/
  package.json    the one-command runner (npm run dev)
  agents/         AI agent
  backend/        backend API
  web/            web app
```

### One command

From the repo root (the `Accord` folder, not `backend` or `web`):

```
npm install
npm run dev
```

`npm install` is only needed the first time (and after pulling changes to the root `package.json`): it installs `concurrently`, the tool that runs the three parts together. `npm run dev` then starts the **AI agent, the backend and the web app** in one terminal. Each line is labeled with the part it comes from, and Ctrl+C stops all three.

Before the first run, install each part (sections 1 to 3) and create its `.env` file.

Notes:
- All three start at the same time. The web app may ask the backend for `/api/me` a moment before the backend is ready and show "We can't reach the server". Wait for the backend line `Server running on http://localhost:3000`, then reload the page.
- The agent part needs `python` to work in your terminal. On a Mac, or if only `python3` or `py` works, change the command in the root `package.json` accordingly.
- Do not also start the parts by hand in other terminals while this is running, because the ports (3000, 5173, 8000) would clash.
- The agent is optional. If it fails to start, the backend uses its rule-based agent and the app still works.

### One terminal per part

You can also run the parts separately, which is handy when you want to restart only one of them. Open one terminal per part and keep them open.

| Terminal | Folder | Command | Needed? |
|---|---|---|---|
| 1 | `agents` | `python -m uvicorn app:app --port 8000` | Optional (rule-based backup if it is off) |
| 2 | `backend` | `node server.js` | Required |
| 3 | `web` | `npm run dev` | Required |

Start the backend before the web app. If the web app starts first and shows "We can't reach the server", start the backend and reload the page.

## 5. Try the demo flow

Use two tabs, one for each person (section 3).

1. **Bob:** open Find services, pick a request in the "Negotiate using this request" list (create one in the Buyer dashboard if there is none), and click **Negotiate** on a listing. This sends a proposal.
2. **Alice:** open **Proposals** and click **Accept**. Accepting can take 10 to 15 seconds on a slow connection. It starts the negotiation, locks Alice's listing and Bob's request, and closes every other pending proposal for either of them.
3. Both tabs follow the live negotiation: up to 3 rounds, with chat. If the limits do not overlap (for example Bob's maximum is below Alice's floor), it ends with no agreement and shows rematch suggestions.
4. When the agents agree, **both people approve** the agreed price on the approval screen. A decline by either person closes the deal and unlocks the seller.
5. **Bob** pays with PayPal. The status comes from PayPal's capture response.
6. **Alice:** open **Sales history** and **My negotiations** to see the result.

`smoke.js` in `backend/` still starts negotiations the old way, with `POST /negotiations`, which no longer exists. It will fail at that step until it is updated, so use this flow to test instead.

## 6. PayPal sandbox accounts

Payments only run in the PayPal **sandbox**: no real money moves.

- In the PayPal Developer Dashboard, under Testing Tools, Sandbox Accounts, you need two accounts: a **Business** account (the seller, which receives the money and is tied to the app keys) and a **Personal** account (the buyer, which pays). Create the Personal one with **Create account** if it is missing.
- When the PayPal window opens on the pay screen, log in with the **Personal** account. PayPal refuses the Business account with "You are logging into the account of the seller".
- To see the payment, log in at `https://www.sandbox.paypal.com` with the Business account and open Activity.
- Payment is locked until **both** people approve the agreed price. The buyer and the seller each approve on `/negotiations/<id>/pay`.

## 7. API status

`API.md` is the contract. This is what the backend answers today:

- **Built:**
  - `GET /api/me`, `GET /api/listings` (keyword, category, price and seller-name search), and `GET /api/requests` (sellers only, public fields only).
  - The six proposal routes: `POST /api/proposals`, `GET /api/proposals`, `GET /api/proposals/incoming-count`, and `accept`, `decline` and `withdraw`. They include the seller lock, the request lock, the self-deal check, and the rule that accepting closes the other pending proposals.
  - The buyer dashboard (`/buyer/requests`, `/buyer/negotiations`) and the seller dashboard (`/seller/listings`, `/seller/active-negotiation`, `/seller/negotiations`, `/seller/sales`).
  - `GET /negotiations/:id`, `/messages` (read and send chat) and `/outcome` (no agreement, with rematch suggestions).
  - The approval routes (`/approval`, `/approval/approve`, `/approval/decline`) and the payment routes (`GET /payment`, `POST /payment/order`, `POST /payment/capture`).
- **Not in `API.md`:** `GET /api/payments/config`, `GET /api/users/demo`, and the error code `RATE_LIMITED` (HTTP 429) from the rate limits.
- **Behavior to know:**
  - A negotiation only starts when someone accepts a proposal. There is no `POST /negotiations`.
  - A declined deal stays `agreed` with `deal: "declined"`, payment stays blocked, and the seller is unlocked right away.
  - Payment errors answer `400 VALIDATION`, as `API.md` says.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find module` or `Cannot find package` when the backend starts | Run `npm install` in `backend`, then start it again. |
| `P1001: Can't reach database server` | Use the pooler connection strings, not the `db.<project>.supabase.co` address. |
| `P1001` now and then, or `Something went wrong` on the first request | The free database can drop the first connection after a pause. Retry once. If it keeps failing, check that the Supabase project is not paused, try a phone hotspot, and ask the database owner to check Network Bans. |
| `@prisma/client did not initialize yet` | Run `npx prisma generate` in `backend`. |
| `Drift detected` from Prisma | Answer **No** to any reset question. Only the database owner changes the database. |
| Prisma says a model or column is missing (for example `dealApproval`, or `column ... does not exist`) | Pull the database owner's latest `schema.prisma`, run `npx prisma generate`, and restart. If it still fails, the database and the schema file disagree, so tell the database owner. |
| Notes still say "Opening below the list price." | The agent is not being used. Check that the agent terminal is running, `AGENT_URL=http://127.0.0.1:8000` is in `backend/.env`, and you restarted the backend. Look for `agent failed` in the backend terminal. |
| `agent failed` in the backend terminal | The agent is not reachable. Start it, and try `AGENT_URL=http://127.0.0.1:8000` instead of `localhost` in `backend/.env`. Until then the backend uses its rule-based agent. |
| `No module named 'dotenv'` (or another module) | `python -m pip install python-dotenv` (or the name shown). |
| Port already in use | Close the old terminal that is still running the server, or change `PORT`. If you use `npm run dev`, do not also start a part by hand. |
| `concurrently` is not recognized, or `npm run dev` says a script is missing | Run `npm install` in the repo root, and check that you are in the `Accord` folder and not in `backend` or `web`. |
| The agent part of `npm run dev` fails with `python` not found | Use the Python command that works on your computer (`python3` or `py`) in the root `package.json`, or install Python (section 2). |
| `.env` change has no effect | Restart the server. `.env` is only read at start. |
| `.env` change in `web` has no effect | Vite reads only `web/.env`, not `.env.example`. Create the file, then restart `npm run dev`. |
| "We can't reach the server", or `ECONNREFUSED` for `/api/me` in the web terminal | The backend is not running yet, or it has not finished starting (with `npm run dev` all three start together). Wait for `Server running on http://localhost:3000`, then reload. If the backend crashed, its error is in the same terminal. Also check that `API_PROXY_TARGET` in `web/.env` matches the backend port. |
| The browser blocks a call to `http://localhost:3000/...` with a CORS message | `VITE_API_URL` must be exactly `/api`, not a full address. Fix `web/.env` and restart `npm run dev`. |
| "Choose who you are" appears | Normal: this tab has no user id yet. Pick a user, or open the address with `?as=<user id>`. |
| The chosen user's data looks wrong, or a user is missing | The ids change after a re-seed. Reload the page and choose again, or check `/api/users/demo`. |
| `Failed to resolve import "ag-studio-react"` or an `ag-grid` import | Run `npm install` in `web`, then restart `npm run dev`. |
| The sales history grid shows a watermark | The optional `VITE_AG_STUDIO_LICENSE` is empty. The grid still works. |
| `429` with `RATE_LIMITED` | A client sent too many requests in a minute. Wait a minute and try again. |
| Accepting a proposal is slow, or fails with `Transaction already closed` | The connection to the database is slow. Accepting allows up to 30 seconds, so retry once. If it keeps happening, check your network. |
| Starting a negotiation with a seller fails with `SELLER_LOCKED` | The seller has an active negotiation, or an agreed deal that is unpaid. It clears when the negotiation ends, or after `LOCK_MINUTES`. |
| The buyer's PayPal button stays locked | Both people must approve first. The seller opens `/negotiations/<id>/pay` and clicks Approve. |
| PayPal says `You are logging into the account of the seller` | You used the Business sandbox account. Log in with the Personal one. |
| PayPal keeps returning to `Continue to Review Order` | Pay with the PayPal balance instead of the saved card, use a fresh Personal sandbox account, and test in a private window with extensions off. |
| Listings, requests or negotiations that nobody on the team added | They are shared test data in the database. Do not delete them by hand: negotiations, offers and payments point to them. Ask the database owner to run the reset script. |

## Security rules

- Never commit `.env` files or paste real keys and passwords in chats or issues.
- The agent receives private limits, so only the backend should call it. Never call it from the browser, and do not put it on a public address without protection.
- The backend decides every price. Chat messages are text only and never change a price.
- If a password or key is ever pasted somewhere public, reset it right away (Supabase: Project Settings, Database, Reset database password) and share the new one privately with the team.
- The `X-User-Id` sign-in is for the demo only. Anyone who knows a user id can act as that user, so it must not be used for real accounts.
- Anything starting with `VITE_` ends up in the browser. Never put a secret there.
