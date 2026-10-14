# API contract (draft)

**Status: proposal, built against by the front end.** The front end now talks to this API through `web/src/api/` (see "How the front end connects" at the bottom). Anything the back end changes must be changed here too, and the front end will follow.

The front end and back end owners should go through "Questions to agree on". Each question has a **front end default**: the front end is built on that default, so if the back end agrees, nothing needs to change.

## Conventions

| Topic | Proposal |
|---|---|
| Format | JSON over HTTPS, base path `/api` |
| Money | Whole US dollars as integers (`500`, not `"$500"` or `50000`). If you need cents, tell the front end and we change `usd()` once. |
| Dates and times | ISO 8601 strings (`"2026-10-12T10:44:00Z"`). The front end formats them for display. Date-only fields (deadlines) use `"2026-10-30"`. |
| IDs | Strings |
| Errors | Non-2xx status with `{ "error": { "code": "SELLER_LOCKED", "message": "Human readable text" } }` |
| Error codes | `VALIDATION`, `NOT_FOUND`, `FORBIDDEN`, `SELLER_LOCKED`, `ROUND_LIMIT`, `UNAUTHENTICATED` |

## Privacy rules (enforced by the API, not the UI)

1. A buyer's response never contains the seller's `priceFloor` or any hint of its value.
2. A seller's response never contains the buyer's `target` or `max`.
3. Only the **engine** decides prices. Chat messages are stored as text and never read as offers.
4. Maximum 3 rounds per negotiation. A seller has at most one active negotiation.
5. The UI hiding a field is not protection: if the browser receives it, it is not private.

## Shared shapes

```jsonc
// Listing
{
  "id": "l1",
  "title": "5-page business website",
  "sellerName": "Maya Santos",
  "description": "Responsive site with contact form, simple CMS setup and launch support.",
  "categories": ["Web development"],
  "tags": ["website"],            // extra search words
  "listPrice": 500,
  "deliveryDays": 7,
  "locked": false                  // true while the seller has an active negotiation
}

// Offer (one per agent per round)
{
  "round": 1,
  "role": "seller",                // "buyer" | "seller"
  "amount": 500,                   // the amount that counts, after the engine check
  "note": "Starting at the list price.",
  "blocked": {                     // only present when the engine replaced the agent's proposal
    "proposed": 520,
    "reason": "above the listed price of $500"
  }
}

// ChatMessage
{ "id": "m1", "from": "seller", "sentAt": "2026-10-12T10:42:00Z", "text": "Hi!" }           // from: "buyer" | "seller"
{ "id": "m4", "from": "system", "tone": "note", "text": "Scope noted: 5 pages, contact form, blog" }  // tone: "note" | "warning"
```

## Endpoints

### Who is the user

This is a feature inside PayPal, so the front end builds **no login screen of its own**. The person is already signed in (through PayPal or a fixed demo user, whichever the back end uses). The front end only asks who they are.

`GET /api/me`

```jsonc
{ "id": "u1", "name": "Alex Morgan", "roles": ["buyer", "seller"] }   // roles: "buyer" | "seller", one or both
```

- The front end shows the Buyer pages only if `roles` has `buyer`, and the Seller pages only if it has `seller`. A person with both gets a "Viewing as" switch.
- `401 UNAUTHENTICATED` means the person is not signed in. The front end shows "Please sign in to continue" and nothing else.
- This is only for menus. **Every other endpoint must still check the role itself** (privacy rules above): a buyer who opens a seller URL by hand must get `403 FORBIDDEN`, never the data.

### Search and start

| Method and path | Purpose | Response |
|---|---|---|
| `GET /api/listings?keyword=&category=&maxPrice=&sort=` | Search. All parameters are optional (empty `category` means every category). `sort` is `match`, `price` or `delivery`. | `Listing[]` |
| `POST /api/negotiations` body `{ "listingId": "l1", "requestId": "r1" }` | Start a negotiation. `requestId` is required: the buyer's target and max come from that request. Also used by "Start negotiation" on the rematch screen. | `201 { "id": "n1" }`. `409 SELLER_LOCKED` if the seller already has an active negotiation. |

### Live negotiation (buyer view)

`GET /api/negotiations/:id`

```jsonc
{
  "id": "n1",
  "status": "active",              // "active" | "agreed" | "no_agreement"
  "service": "5-page business website",
  "sellerName": "Maya Santos",
  "listPrice": 500,
  "round": 2,
  "maxRounds": 3,
  "waitingOn": "seller",           // "buyer" | "seller" | null
  "buyerLimits": { "target": 350, "max": 400 },   // the caller's own limits only
  "agreedPrice": null,             // a number when status is "agreed", otherwise null
  "offers": [ /* Offer[] */ ]
}
```

| Method and path | Purpose |
|---|---|
| `GET /api/negotiations/:id/messages` | `ChatMessage[]`, oldest first. Supports `?after=<messageId>` to return only newer messages. |
| `POST /api/negotiations/:id/messages` body `{ "text": "..." }` | Send a chat message. Returns a **list**: the stored message, followed by a `system` warning message if the text looks like a price. `ROUND_LIMIT` or `FORBIDDEN` errors use the error shape above. |

The front end calls `GET /api/negotiations/:id` every 3 seconds while `status` is `active`, and stops when it is `agreed` or `no_agreement`. It then moves the buyer to `/negotiations/:id/pay` (agreed) or `/negotiations/:id/no-agreement`. The chat polls `GET .../messages?after=<last id>` the same way.

### Session ended

`GET /api/negotiations/:id/outcome` (only when `status` is `no_agreement`)

```jsonc
{
  "id": "n2",
  "service": "5-page business website",
  "sellerName": "Maya Santos",
  "rounds": [ { "round": 1, "buyer": 240, "seller": 500 }, { "round": 2, "buyer": 270, "seller": 460 }, { "round": 3, "buyer": 300, "seller": 420 } ],
  "rematches": [   // already ranked, best first, max 3
    { "listingId": "l5", "title": "Small business website", "sellerName": "Amara Osei", "listPrice": 350,
      "reasons": ["Similar scope: 5-page website", "Available now"] }
  ]
}
```

### Buyer dashboard

| Method and path | Body or response |
|---|---|
| `GET /api/buyer/requests` | `BuyerRequest[]`: `{ id, title, category, deliverables, deadline, target, max }` |
| `POST /api/buyer/requests` | Same fields without `id`. Returns the stored request. Validation: `max >= target`, deadline not in the past (`400 VALIDATION`). |
| `GET /api/buyer/negotiations` | `{ id, service, sellerName, status, round, maxRounds, buyerOffer, sellerOffer }[]`. `status` is `active`, `agreed` or `no_agreement`. |

### Seller dashboard

| Method and path | Body or response |
|---|---|
| `GET /api/seller/listings` | `SellerListing[]`: `{ id, title, category, deliverables, listPrice, priceFloor, deliveryDays }` |
| `POST /api/seller/listings` | Same fields without `id`. Returns the stored listing. Validation: `priceFloor <= listPrice` (`400 VALIDATION`). |
| `PUT /api/seller/listings/:id` | Same fields. Returns the stored listing. `409 SELLER_LOCKED` if the listing is in an active negotiation. |
| `GET /api/seller/active-negotiation` | `{ "negotiationId": "n1", "listingId": "l1", "round": 2, "maxRounds": 3 }` or `null` |

**The seller's view of a negotiation.** The seller opens `/negotiations/:id` from the active-negotiation notice on their dashboard. It uses the same endpoints as the buyer, and the API answers according to who is calling:

- `GET /api/negotiations/:id` for the seller's session returns the same shape, **without `buyerLimits`**, and with `buyerName` (for example `"Sam Lee"`). `offers` carry the amounts that counted, so nothing about the buyer's limits can be worked out from them.
- `GET` and `POST .../messages` set `from` (`"buyer"` or `"seller"`) from the caller's session. The front end never sends it.
- A caller who is neither the buyer nor the seller of that negotiation gets `403 FORBIDDEN`.
- The seller's own agent card and floor are not shown yet. The seller sees the round counter, the log and the chat.

### Not defined yet

- Approve and pay (PayPal sandbox): `/negotiations/:id/pay` is a front-end route, but the approve and capture endpoints still need to be agreed (Day 5).
- How the person gets signed in (PayPal sign-in or a fixed demo user). The front end only needs `GET /api/me` to work (see questions).

## Questions to agree on

Tick the box when the back end agrees, or edit the answer.

| | Question | Front end default (built on this) |
|---|---|---|
| [ ] | **Who is the user?** The front end has no login screen. How does the back end know who is calling, and how do we know buyer from seller? | The person is already signed in (PayPal sign-in, or a fixed demo user). The back end identifies them on every request and answers `GET /api/me` with `{ id, name, roles }`. The front end sends `credentials: "include"` (a session cookie works) and expects `401 UNAUTHENTICATED` when nobody is signed in. If the team wants a real "Log in with PayPal" button, the back end handles the code exchange and the front end only adds the button. |
| [ ] | **Search on the server:** does `GET /api/listings` filter and sort? | Yes. The front end sends `keyword`, `category`, `maxPrice` and `sort` and shows exactly what comes back. If the back end ignores them, the page still loads but never filters, so please confirm. |
| [ ] | **Updates:** polling, WebSockets or server-sent events? | Polling every **3 seconds** for the negotiation and the chat. Upgrade chat to server-sent events or WebSockets on Day 4 if it feels slow. |
| [ ] | **Money:** whole dollars or cents? | Whole dollars (integers). |
| [ ] | **Round rules:** who goes first in each round, and does the engine move to the next round by itself? | The buyer agent goes first, then the seller agent. The engine moves to the next round on its own once both offers are stored. The front end only reads `round`, `waitingOn` and `status`. |
| [ ] | **Rematch ranking:** does the API rank rematches, or does the front end? | The API ranks them (best first, at most 3). The front end shows them in the order received. |
| [ ] | **Deal reached:** what does the API return when both agents agree, and which endpoint does the buyer call to approve? | `status` becomes `agreed` and `agreedPrice` is set. The front end then opens `/negotiations/:id/pay`. The approve and capture endpoints are agreed on Day 5. |
| [ ] | **Which request does a negotiation use?** | The buyer picks one of their saved requests (the first by default) and the front end sends its `requestId` in `POST /api/negotiations`. A buyer without a request is sent to the buyer dashboard first. |
| [ ] | **CORS and base URL:** | In development the front end calls `/api` on its own address and Vite forwards it to the back end (`API_PROXY_TARGET`), so no CORS is needed. In production set `VITE_API_URL` and enable CORS with credentials. |
| [ ] | **Limits on messages:** maximum length and rate limit. | Front end stops at 500 characters. Back end should enforce its own limit and answer `400 VALIDATION`. |

## How the front end connects

All server calls live in `web/src/api/`. Screens never call `fetch` directly and never import sample data.

| Setting (`web/.env`) | Meaning |
|---|---|
| `VITE_USE_MOCK=true` | Use the built-in demo data (one scenario, in memory). **This is the default**, so the app runs before the back end exists. |
| `VITE_USE_MOCK=false` | Use the real API. |
| `VITE_API_URL=/api` | Where the API lives. |
| `API_PROXY_TARGET=http://localhost:3000` | Development only: where Vite forwards `/api`. |
| `VITE_POLL_MS=3000` | Polling interval. |

Copy `web/.env.example` to `web/.env` and edit it.
