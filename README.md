# Agent Negotiation Marketplace (PayPal Hackathon)

Buyer and seller AI agents negotiate a service price in at most 3 rounds, then settle through the PayPal sandbox after both humans approve. Payments run in the PayPal sandbox only.

## Structure

- `web/` front end (React + Vite + TypeScript + React Router)
- `api/` back end (to be added by the back end teammate)
- `agents/` AI agent service (to be added by the AI/ML teammate)

## Run the front end

```bash
cmd web
npm install
npm run dev
```

Open http://localhost:5173

## Routes

| Route | Screen |
|---|---|
| `/search` | Search services |
| `/buyer` | Buyer dashboard |
| `/seller` | Seller dashboard |
| `/negotiations/:id` | Live negotiation and chat |
| `/negotiations/:id/pay` | Approve and pay |
| `/negotiations/:id/no-agreement` | No agreement and rematch suggestions |

## Rules for everyone

- Never commit secrets. Keep keys in `.env` files (git-ignored) and share a `.env.example` instead.
- Work on a branch and open a pull request into `main`.
- Pull first then push the changes
