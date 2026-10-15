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
| Error codes | `VALIDATION`, `NOT_FOUND`, `FORBIDDEN`, `SELLER_LOCKED`, `REQUEST_LOCKED`, `ROUND_LIMIT`, `UNAUTHENTICATED` |

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
  "locked": false,                 // true while the seller has an active negotiation
  "mine": false                    // true when the signed-in person owns it (a person can't negotiate with themselves)
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
  "deadline": "2026-10-28",
  "locked": false,                 // true while the request is in a negotiation, so a new proposal for it is refused
  "mine": false                    // true when the signed-in person owns it
}

// DealApproval (both humans' decisions on an agreed price, see "Approval before payment")
{
  "negotiationId": "n1",
  "agreedPrice": 380,
  "buyer": "approved",             // "pending" | "approved" | "declined"
  "seller": "pending",             // "pending" | "approved" | "declined"
  "status": "pending"              // overall: "approved" only when both approved, "declined" as soon as either declined, otherwise "pending"
}

// Proposal (how every negotiation starts, see "Proposals")
{
  "id": "p1",
  "direction": "incoming",         // relative to the caller: "incoming" = the other side sent it, "outgoing" = the caller sent it
  "status": "pending",             // "pending" | "accepted" | "declined" | "withdrawn"
  "createdAt": "2026-10-13T09:00:00Z",
  "listing": { "id": "l3", "title": "Landing page and brand setup", "sellerName": "Priya Nair", "listPrice": 380 },
  "request": { "id": "r1", "title": "5-page business website", "buyerName": "Alex Morgan", "deliverables": "5 pages, contact form, blog", "deadline": "2026-10-30" },
  "negotiationId": null,           // set once accepted; the id the caller opens at /negotiations/:id
  "closedReason": null             // "taken" when the server declined it by itself because its listing or request went into another negotiation, otherwise null
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
| `GET /api/listings?keyword=&category=&maxPrice=&sort=` | Search. All parameters are optional (empty `category` means every category). `keyword` is free text: every word must match the title, tags, category, description or seller name. `sort` is `match` (most relevant first: title and tag hits rank above description hits), `price` or `delivery`. The front end sends a request as the person types (after a short pause), so keep it fast. | `Listing[]` |
| `GET /api/requests?keyword=&category=&sort=` | **Sellers only** (`403 FORBIDDEN` for a buyer-only account). Search what buyers need. `keyword` matches title, category, deliverables or buyer name (every word must match). `sort` is `match` (most relevant first) or `deadline` (soonest first). Never returns prices. | `OpenRequest[]` |

### Proposals (how a negotiation starts)

A negotiation never starts on one side's click. Whoever starts sends a **proposal**, the other side accepts or declines, and only an accepted proposal creates the negotiation. This is the same for both sides. It is also what "Negotiate" does on the search screens and on the rematch screen.

**Which side am I?** An account can be a buyer, a seller or both. For a person with both roles, the caller's side is never guessed: the front end always says which side it is acting as with `role` (`"buyer"` or `"seller"`). A `role` the account does not have is `403 FORBIDDEN`. For an account with one role, `role` may be left out.

| Method and path | Purpose | Response |
|---|---|---|
| `POST /api/proposals` body `{ "role": "buyer", "listingId": "l3", "requestId": "r1" }` | Send a proposal as `role`. A buyer must own `requestId`, a seller must own `listingId` (`403 FORBIDDEN` otherwise). `400 VALIDATION` if the listing and the request belong to the same person (a self-deal, see below), or if the same listing and request already have a pending proposal, in either direction (the message says whether to wait or to accept theirs). `409 SELLER_LOCKED` if the listing is in a negotiation. `409 REQUEST_LOCKED` if the request is in a negotiation. | `201 { "id": "p1" }` |
| `GET /api/proposals?role=buyer` | Every proposal the caller sent or received **as that side**, newest first. A person with both roles must send `role`, or gets `400 VALIDATION`: the two sides are never mixed in one list. | `Proposal[]` |
| `GET /api/proposals/incoming-count?role=buyer` | How many pending proposals wait for that side's answer (the number on the "Proposals" link). Cheap, so the front end asks for it on every screen. | `{ "count": 2 }` |
| `POST /api/proposals/:id/accept` | Only the receiving side, only while `pending`. Creates the negotiation, locks the listing **and** the request, and closes every other pending proposal for either of them (see "Locks and stale proposals"). `409 SELLER_LOCKED` or `409 REQUEST_LOCKED` if either got locked in the meantime. | The updated `Proposal` (`status: "accepted"`, `negotiationId` set) |
| `POST /api/proposals/:id/decline` | Only the receiving side, only while `pending`. | The updated `Proposal` (`status: "declined"`) |
| `POST /api/proposals/:id/withdraw` | Only the side that sent it, only while `pending` (`403 FORBIDDEN` for the receiver, `400 VALIDATION` if it was already answered, for example accepted a moment ago). | The updated `Proposal` (`status: "withdrawn"`) |

The buyer's `target` and `max` come from the proposal's request and the seller's `priceFloor` from its listing. The engine reads them on the server; they are never copied into a proposal.

#### Locks and stale proposals

1. **A listing and a request are each in at most one negotiation at a time.** Accepting a proposal locks its listing (rule 4) and its request. Without the request lock, a buyer could accept two sellers' proposals for the same request and end up with two deals.
2. **A lock ends** when the negotiation ends without a deal (`no_agreement`) or when the deal is declined (see "Approval before payment"). Until then a new proposal for that listing or request is `409 SELLER_LOCKED` or `409 REQUEST_LOCKED`.
3. **Accepting closes the others.** In the same transaction that creates the negotiation, every other `pending` proposal (in either direction) that uses the same listing or the same request becomes `declined` with `closedReason: "taken"`. Nobody has to hit an error to find out. The check, the locks and the closing happen atomically: if two accepts race, one wins and the other gets `409`.
4. **Nothing expires by time.** A pending proposal stays until it is accepted, declined, withdrawn or closed by rule 3.
5. A proposal that was `declined` by a person has `closedReason: null`, so the screens can tell a person's answer from an automatic close.

#### Self-deals

A listing and a request that belong to the same person can never be matched. `POST /api/proposals` and `.../accept` answer `400 VALIDATION` ("You can't negotiate with yourself"). Listings and open requests carry `mine`, so the screens can show them as the person's own and disable "Negotiate" instead of waiting for the error. As always, the API is the protection, not the UI.

#### Notifications

There are no push messages. The front end polls: `GET /api/proposals/incoming-count?role=` on every screen (at most every 10 seconds, paused while the tab is hidden) to show the badge on the "Proposals" link, and `GET /api/proposals?role=` every 3 seconds while the Proposals screen is open.

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

The front end calls `GET /api/negotiations/:id` every 3 seconds while `status` is `active`, and stops when it is `agreed` or `no_agreement`. A buyer is then moved to `/negotiations/:id/pay` (agreed) or `/negotiations/:id/no-agreement`. A seller stays on the page, which shows the result ("Agreed at $380" with the live approval status and a link to the same approval screen, or "No agreement"). Later they find it again in `GET /api/seller/negotiations`. `403 FORBIDDEN` if the caller is neither the buyer nor the seller of that negotiation. The chat polls `GET .../messages?after=<last id>` the same way.

### Approval before payment

When a negotiation is `agreed`, nobody pays yet. **Both humans must approve the agreed price first.** The buyer and the seller each answer once, and the two answers live in one shared `DealApproval` (see "Shared shapes"). Payment stays locked until its `status` is `approved`.

| Method and path | Purpose | Response |
|---|---|---|
| `GET /api/negotiations/:id/approval` | Read both decisions. Both sides see the same object (decisions are not private, unlike limits). `400 VALIDATION` if the negotiation is not `agreed`. `403 FORBIDDEN` if the caller is neither its buyer nor its seller. | `DealApproval` |
| `POST /api/negotiations/:id/approval/approve` | Record the caller's approval (the caller's side comes from who is signed in, never from the body). | The updated `DealApproval` |
| `POST /api/negotiations/:id/approval/decline` | Record the caller's refusal. The deal is closed and nothing is charged. | The updated `DealApproval` |

Rules (enforced by the API):

1. Both decisions start as `pending` the moment the negotiation becomes `agreed`. Nobody can answer before that (`400 VALIDATION`).
2. Each side answers once. A second answer from the same side is `400 VALIDATION`. Once either side has declined, the deal is `declined` and approving is `400 VALIDATION`.
3. `status` is `approved` only when `buyer` and `seller` are both `approved`.
4. Payment is **locked until `status` is `approved`**. Any endpoint that creates or captures a PayPal order for this negotiation must check it and answer `400 VALIDATION` ("Both sides must approve the agreed price first") otherwise. The buttons in the UI are not the protection, the API is.
5. The price the people approve is `agreedPrice`, set by the engine. A decision never changes it.
6. When the deal is `declined`, the negotiation's listing and request are unlocked (see "Locks and stale proposals").

The front end calls `GET .../approval` every 3 seconds while `status` is `pending` (so each side sees the other's answer) and stops at `approved` or `declined`. The screen is `/negotiations/:id/pay` for **both** roles: the seller sees the price, both decisions and Approve/Decline buttons but never a pay button, and the buyer also sees the locked payment button.

### Payment (PayPal sandbox)

Only the buyer pays, and only after both sides approved. The front end shows PayPal's own buttons and **never sends an amount**: the server creates the order for the deal's `agreedPrice`, and captures it after the buyer approves in the PayPal window. All three calls need the signed-in session cookie.

| Method and path | Purpose | Response |
|---|---|---|
| `GET /api/negotiations/:id/payment` | Read the payment. Both sides may read it (the seller's page uses it to show "paid"). `400 VALIDATION` if the negotiation is not `agreed`. `403 FORBIDDEN` if the caller is neither its buyer nor its seller. | `Payment` |
| `POST /api/negotiations/:id/payment/order` | Create the PayPal order (intent `CAPTURE`, currency `USD`, amount `agreedPrice`). Buyer only (`403 FORBIDDEN` for anyone else). `400 VALIDATION` ("Both sides must approve the agreed price first") unless the approval `status` is `approved`, and `400 VALIDATION` if already paid. | `{ "orderId": "5O190127TN364715T" }` |
| `POST /api/negotiations/:id/payment/capture` | Body `{ "orderId": "..." }`. Capture that order. Same checks as above, and `400 VALIDATION` if `orderId` is not the order created for this negotiation. When PayPal declines, answer `400 VALIDATION` with a readable `message`. | The updated `Payment` (`status` is `paid`) |

`Payment` (see `types/marketplace.ts`):

```json
{
  "negotiationId": "n7",
  "status": "paid",          // "unpaid" | "paid"
  "amount": 380,             // whole dollars, always the deal's agreedPrice
  "orderId": "5O190127TN364715T",   // null until an order exists
  "captureId": "3C679366HH908993F", // null until paid
  "paidAt": "2026-10-14T09:30:00Z"  // null until paid
}
```

The front end calls `GET .../payment` every 3 seconds until `status` is `paid`, so the seller sees the payment arrive. Setup: the front end uses **PayPal's JS SDK v6**. It loads `https://www.sandbox.paypal.com/web-sdk/v6/core`, creates the SDK instance with the **sandbox client ID** (`VITE_PAYPAL_CLIENT_ID` in `web/.env`) and the `paypal-payments` component, and shows a `<paypal-button>`. On click it starts a one-time payment session with the order id from `POST .../payment/order`, and after the buyer approves it calls `POST .../payment/capture`. The PayPal **secret** stays on the server only. See https://developer.paypal.com/checkout/integrate.

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
| `GET /api/buyer/requests` | `BuyerRequest[]`: `{ id, title, category, deliverables, deadline, target, max, locked }`. `locked` is true while the request is in a negotiation. |
| `POST /api/buyer/requests` | Same fields without `id` and `locked`. Returns the stored request. Validation: `max >= target`, deadline not in the past (`400 VALIDATION`). |
| `GET /api/buyer/negotiations` | `{ id, service, sellerName, status, round, maxRounds, buyerOffer, sellerOffer }[]`. `status` is `active`, `agreed` or `no_agreement`. |

### Seller dashboard

| Method and path | Body or response |
|---|---|
| `GET /api/seller/listings` | `SellerListing[]`: `{ id, title, category, deliverables, listPrice, priceFloor, deliveryDays }` |
| `POST /api/seller/listings` | Same fields without `id`. Returns the stored listing. Validation: `priceFloor <= listPrice` (`400 VALIDATION`). |
| `PUT /api/seller/listings/:id` | Same fields. Returns the stored listing. `409 SELLER_LOCKED` if the listing is in an active negotiation. |
| `GET /api/seller/active-negotiation` | `{ "negotiationId": "n1", "listingId": "l1", "round": 2, "maxRounds": 3 }` or `null` |
| `GET /api/seller/negotiations` | The seller's whole history, newest first, so a negotiation can be found again after it ends: `SellerNegotiationRow[]` (below). The counterpart of `GET /api/buyer/negotiations`. |

`SellerNegotiationRow`:

```jsonc
{
  "id": "n1",
  "service": "5-page business website",
  "buyerName": "Jordan Lee",
  "status": "agreed",              // "active" | "agreed" | "no_agreement"
  "round": 3,
  "maxRounds": 3,
  "buyerOffer": 380,               // the latest offer of each agent (same meaning as in the buyer's list)
  "sellerOffer": 380,
  "agreedPrice": 380,              // a number when status is "agreed", otherwise null
  "deal": "pending"                // when status is "agreed": the DealApproval status ("pending" | "approved" | "declined"), otherwise null
}
```

Rows never contain the buyer's `target` or `max` (rule 2). The dashboard links each row to `/negotiations/:id` (active, or no agreement: the seller's own view, their floor and their agent) or `/negotiations/:id/pay` (agreed: the approval screen, see "Approval before payment"). While any row is `active`, or `agreed` with `deal: "pending"`, the front end asks again every 3 seconds, and it stops by itself once nothing is moving. The seller's negotiation page also follows `GET .../approval` after "agreed" until the deal is approved or declined.

### Not defined yet

- PayPal sandbox payment: the create, capture and read endpoints are proposed above ("Payment (PayPal sandbox)") and built on the front end. The back end teammate needs to confirm or change them.
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
| [ ] | **Deal reached:** what does the API return when both agents agree, and how do the humans approve? | `status` becomes `agreed` and `agreedPrice` is set. A buyer is then moved to `/negotiations/:id/pay`; a seller opens the same screen from the result. Each human answers through `POST .../approval/approve` or `.../approval/decline`, and the shared `DealApproval` records both answers (see "Approval before payment"). Only the capture endpoints are agreed on Day 5. |
| [ ] | **Approval rules:** is each answer final, and can payment start before both approve? | Each answer is final. Either decline closes the deal. Payment is locked until both approve, and the API refuses to create or capture an order before that. |
| [ ] | **Proposals:** does every negotiation start with a proposal that the other side accepts? | Yes, for both directions (see "Proposals"). A buyer picks one of their saved requests that is not in a negotiation (the first by default) and sends `{ role: "buyer", listingId, requestId }`. A seller picks one of their listings that is not in a negotiation and sends the same body with `role: "seller"`. There is no `POST /api/negotiations`. |
| [ ] | **Proposal rules:** can a proposal expire or be withdrawn? When exactly does a lock begin? | No expiry. The sender can **withdraw** a pending proposal (`POST .../withdraw`). The lock begins only when a proposal is **accepted**, and it covers the listing **and** the request. Accepting also declines every other pending proposal for either of them (`closedReason: "taken"`). If two are accepted at once, the second accept returns `409 SELLER_LOCKED` or `409 REQUEST_LOCKED`. A lock ends when the negotiation ends with no deal or the deal is declined. |
| [ ] | **Seller history:** can a seller find a negotiation again after it agreed or ended? | Yes: `GET /api/seller/negotiations` returns every negotiation (active, agreed, no agreement), like the buyer's list, and carries the approval status of agreed ones. |
| [ ] | **Accounts with both roles:** which side does `/api/proposals` return? | Neither by guessing. The front end always sends `role` (`GET /api/proposals?role=`, `POST /api/proposals` body `role`), and the lists are never mixed. |
| [ ] | **Self-deals:** can a person propose their own listing to their own request? | No. `400 VALIDATION` on send and on accept. Listings and open requests carry `mine` so the screens can disable the button. |
| [ ] | **Notifications:** how does a person learn a proposal arrived? | Polling, no push. A badge on the "Proposals" link from `GET /api/proposals/incoming-count?role=` (every 10 seconds at most), plus the Proposals screen's own 3-second refresh while open. |
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
