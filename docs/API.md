# API contract (draft)

**Status: proposal.** This is what the front end expects, based on `web/src/types/marketplace.ts` and `web/src/types/dashboard.ts`. The front end and back end owners should go through the "Questions to agree on" section, edit this file until both sides agree, and then the front-end types will be changed to match.

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

### Search and start

| Method and path | Purpose | Response |
|---|---|---|
| `GET /api/listings?keyword=&category=&maxPrice=&sort=` | Search. `sort` is `match`, `price` or `delivery`. | `Listing[]` |
| `POST /api/negotiations` body `{ "listingId": "l1", "requestId": "r1" }` | Start a negotiation. | `201 { "id": "n1" }`. `409 SELLER_LOCKED` if the seller already has an active negotiation. |

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
  "offers": [ /* Offer[] */ ]
}
```

| Method and path | Purpose |
|---|---|
| `GET /api/negotiations/:id/messages` | `ChatMessage[]`, oldest first. Supports `?after=<messageId>` for polling. |
| `POST /api/negotiations/:id/messages` body `{ "text": "..." }` | Send a chat message. Returns the stored message, plus a `system` warning message if the text looks like a price. |

The front end will poll `GET /api/negotiations/:id` every few seconds until you offer something better (see questions).

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
| `POST /api/buyer/requests` | Same fields without `id`. Validation: `max >= target`, deadline not in the past. |
| `GET /api/buyer/negotiations` | `{ id, service, sellerName, status, round, maxRounds, buyerOffer, sellerOffer }[]` |

### Seller dashboard

| Method and path | Body or response |
|---|---|
| `GET /api/seller/listings` | `SellerListing[]`: `{ id, title, category, deliverables, listPrice, priceFloor, deliveryDays }` |
| `POST /api/seller/listings` | Same fields without `id`. Validation: `priceFloor <= listPrice`. |
| `PUT /api/seller/listings/:id` | Same fields. `409` if the listing is in an active negotiation. |
| `GET /api/seller/active-negotiation` | `{ "negotiationId": "n1", "listingId": "l1", "round": 2, "maxRounds": 3 }` or `null` |

### Not defined yet

- Approve and pay (PayPal sandbox): `/negotiations/:id/pay` is a front-end route, but the approve and capture endpoints still need to be agreed.
- Login and roles (see questions).

## Differences from the current front-end types

When this is agreed, the front end will change these:

1. `ChatMessage.time` (`"10:42"`) becomes `sentAt` (ISO string), formatted by the browser.
2. `Negotiation` gains `status`.
3. `Negotiation.id` is no longer `demo`. All links will use the id returned by `POST /api/negotiations`.
4. `buyerLimits` stays for the buyer view. A seller view of the negotiation is not designed yet.

## Questions to agree on

- [ ] **Login:** how does the browser prove who it is (cookie, token)? How do we know if the user is a buyer or a seller?
- [ ] **Updates:** polling every ___ seconds, or WebSockets or server-sent events?
- [ ] **Money:** whole dollars, as proposed, or cents?
- [ ] **Round rules:** who goes first in each round, and does the engine move to the next round on its own?
- [ ] **Rematch ranking:** does the API rank rematches, or does the front end?
- [ ] **Deal reached:** what does the API return when both agents agree, and which endpoint does the buyer call to approve?
- [ ] **CORS and base URL:** the front end will read the API address from `VITE_API_URL` in `.env`.
- [ ] **Limits on messages:** maximum chat message length, and rate limit.
