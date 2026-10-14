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
5. Sellers who search buyer requests receive only public fields (see `OpenRequest`): never `target`, `max` or any hint of a budget. Buyers who search listings never receive `priceFloor`.
6. The UI hiding a field is not protection: if the browser receives it, it is not private.

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

// OpenRequest (what a seller sees when searching buyer needs: public fields only)
{
  "id": "q1",
  "title": "Blog posts for a bakery",
  "buyerName": "Sofia Alvarez",
  "category": "Writing",
  "deliverables": "3 posts of 600 words, friendly tone",
  "deadline": "2026-10-28"
}

// Proposal (how every negotiation starts, see "Proposals")
{
  "id": "p1",
  "direction": "incoming",         // relative to the caller: "incoming" = the other side sent it, "outgoing" = the caller sent it
  "status": "pending",             // "pending" | "accepted" | "declined"
  "createdAt": "2026-10-13T09:00:00Z",
  "listing": { "id": "l3", "title": "Landing page and brand setup", "sellerName": "Priya Nair", "listPrice": 380 },
  "request": { "id": "r1", "title": "5-page business website", "buyerName": "Alex Morgan", "deliverables": "5 pages, contact form, blog", "deadline": "2026-10-30" },
  "negotiationId": null            // set once accepted; the id the caller opens at /negotiations/:id
}
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

### Search

| Method and path | Purpose | Response |
|---|---|---|
| `GET /api/listings?keyword=&category=&maxPrice=&sort=` | Search. All parameters are optional (empty `category` means every category). `sort` is `match`, `price` or `delivery`. | `Listing[]` |
| `GET /api/requests?keyword=&category=&sort=` | **Sellers only** (`403 FORBIDDEN` for a buyer-only account). Search what buyers need. `sort` is `match` or `deadline` (soonest first). Never returns prices. | `OpenRequest[]` |

### Proposals (how a negotiation starts)

A negotiation never starts on one side's click. Whoever starts sends a **proposal**, the other side accepts or declines, and only an accepted proposal creates the negotiation (and locks the seller's listing, rule 4). This is the same for both sides. It is also what "Negotiate" does on the search screens and on the rematch screen.

| Method and path | Purpose | Response |
|---|---|---|
| `POST /api/proposals` body `{ "listingId": "l3", "requestId": "r1" }` | Send a proposal. The caller's role says who started it: a buyer must own `requestId`, a seller must own `listingId` (`403 FORBIDDEN` otherwise). `409 SELLER_LOCKED` if the listing is already in an active negotiation. `400 VALIDATION` if the same listing and request already have a pending proposal, in either direction (the message says whether to wait or to accept theirs). | `201 { "id": "p1" }` |
| `GET /api/proposals` | Every proposal the caller sent or received, newest first. | `Proposal[]` |
| `POST /api/proposals/:id/accept` | Only the receiving side, only while `pending`. Creates the negotiation. `409 SELLER_LOCKED` if the listing got locked in the meantime. | The updated `Proposal` (`status: "accepted"`, `negotiationId` set) |
| `POST /api/proposals/:id/decline` | Only the receiving side, only while `pending`. | The updated `Proposal` (`status: "declined"`) |

The buyer's `target` and `max` come from the proposal's request and the seller's `priceFloor` from its listing. The engine reads them on the server; they are never copied into a proposal.

### Live negotiation (buyer and seller view)

`GET /api/negotiations/:id`

```jsonc
{
  "id": "n1",
  "status": "active",              // "active" | "agreed" | "no_agreement"
  "viewerRole": "buyer",           // the caller's side: "buyer" | "seller"
  "service": "5-page business website",
  "counterpartName": "Maya Santos",   // the seller for a buyer, the buyer for a seller
  "listPrice": 500,
  "round": 2,
  "maxRounds": 3,
  "waitingOn": "seller",           // "buyer" | "seller" | null
  "buyerLimits": { "target": 350, "max": 400 },   // only for a buyer. A seller gets "sellerLimits": { "floor": 320 } instead. Never both.
  "agreedPrice": null,             // a number when status is "agreed", otherwise null
  "offers": [ /* Offer[] */ ]
}
```

| Method and path | Purpose |
|---|---|
| `GET /api/negotiations/:id/messages` | `ChatMessage[]`, oldest first. Supports `?after=<messageId>` to return only newer messages. |
| `POST /api/negotiations/:id/messages` body `{ "text": "..." }` | Send a chat message. Returns a **list**: the stored message, followed by a `system` warning message if the text looks like a price. `ROUND_LIMIT` or `FORBIDDEN` errors use the error shape above. |

The front end calls `GET /api/negotiations/:id` every 3 seconds while `status` is `active`, and stops when it is `agreed` or `no_agreement`. A buyer is then moved to `/negotiations/:id/pay` (agreed) or `/negotiations/:id/no-agreement`. A seller stays on the page, which shows the result ("Agreed at $380, waiting for the buyer" or "No agreement"). `403 FORBIDDEN` if the caller is neither the buyer nor the seller of that negotiation. The chat polls `GET .../messages?after=<last id>` the same way.

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

The seller dashboard links `negotiationId` to `/negotiations/:id`, which shows the seller's own view (their floor, their agent).

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
| [ ] | **Proposals:** does every negotiation start with a proposal that the other side accepts? | Yes, for both directions (see "Proposals"). A buyer picks one of their saved requests (the first by default) and sends `{ listingId, requestId }`. A seller picks one of their listings that is not in a negotiation and sends the same body. There is no `POST /api/negotiations`. |
| [ ] | **Proposal rules:** can a proposal expire or be withdrawn? When exactly does the seller lock begin? | No expiry and no withdraw button in the front end. The lock begins only when a proposal is **accepted**, so a seller can have several pending proposals and the first one accepted wins. If two are accepted at once, the second accept returns `409 SELLER_LOCKED`. |
| [ ] | **Seller search:** does `GET /api/requests` return only public fields? | Yes: `id`, `title`, `buyerName`, `category`, `deliverables`, `deadline`. Never `target`, `max` or anything about budget. |
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
