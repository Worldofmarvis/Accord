# Accord: AI Negotiation Marketplace

> Buyers and sellers set the goal. AI agents do the haggling. PayPal closes the deal.

Built for the **PayPal AI Hackathon**.

Accord is a marketplace where AI agents negotiate on behalf of buyers and sellers. Instead of going back and forth in chat for hours, each side lets its agent find a fair price automatically. When both people are happy, they approve the deal and pay through PayPal.

## What It Does

- **Live proposal negotiation:** a buyer sends a proposal on a listing, and the seller's agent and the buyer's agent negotiate it in real time.
- **Agent-to-agent negotiation:** agents negotiate for up to 3 rounds to reach a price both sides can accept.
- **Human approval:** a deal is final only when both the buyer and the seller click Approve.
- **Built-in chat:** buyers and sellers can talk directly at any time.
- **PayPal sandbox payments:** once a deal is approved, the buyer pays using PayPal.
- **Automatic fallback:** if the AI agent goes offline, a built-in rule-based agent takes over so negotiations never get stuck.

## How It Works

1. A buyer finds a service and clicks **Negotiate** to send a proposal.
2. The seller accepts the proposal. The listing is locked and the live negotiation starts.
3. The AI agents negotiate for up to 3 rounds.
4. If they agree, both the buyer and the seller **Approve** the deal.
5. The buyer completes payment with PayPal.

## Tech Stack

| Part | Technology | Port |
|------|------------|------|
| Web Frontend | React + Vite | 5173 |
| Backend API | Node.js + Express + Prisma + Supabase | 3000 |
| AI Agent | Python + FastAPI + Gemini | 8000 |
| Payments | PayPal Sandbox | n/a |

## Try It Yourself

### Prerequisites

- Node.js 18 or newer (`node --version`)
- Python 3.10 or newer (`python --version` or `python3 --version`)
- Git (`git --version`)
- Database credentials: contact the database owner privately for the Supabase connection strings.

### 1. Set Up Environment Variables

Copy each `.env.example` file to `.env` in its folder. Never commit your `.env` files.

| File | What to add |
|------|-------------|
| `backend/.env` | Supabase database strings and PayPal sandbox keys |
| `web/.env` | Keep the defaults (`VITE_USE_MOCK=false`, `VITE_API_URL=/api`, `API_PROXY_TARGET=http://localhost:3000`) and add your public `VITE_PAYPAL_CLIENT_ID` |
| `agents/.env` | (Optional) Your Gemini API key, to enable LLM notes |

### 2. Install Dependencies

```bash
# Root directory (installs the concurrent runner)
npm install

# Backend
cd backend
npm install
npx prisma generate
cd ..

# Web
cd web
npm install
cd ..

# AI Agent
cd agents
python -m pip install fastapi uvicorn python-dotenv requests google-genai
cd ..
```

### 3. Run the App

From the root directory:

```bash
npm run dev
```

This one command starts the backend API, the web frontend, and the AI agent together in a single terminal.

## Demo Walkthrough

1. Open `http://localhost:5173/` in your browser.
2. Choose **Alice Seller**.
3. Open a second tab at the same address and choose **Bob Buyer**.
4. As Bob, find a service and click **Negotiate** to send a proposal.
5. As Alice, go to **Proposals** and accept it. This locks the listing and starts the live negotiation.
6. Watch the agents negotiate for up to 3 rounds. If they agree, both users click **Approve** on their own screens.
7. As Bob, complete the test payment using a **Personal PayPal Sandbox account**.

## More Documentation

For environment variables, PayPal sandbox account setup, API routes, database rules, and troubleshooting, see the full [Setup Guide](SETUP.md).
