# Design mockups (Day 1)

Static mockups of the three new features, agreed with the team. They are pictures of the screens, not working code: all names and prices are sample data, and nothing here is connected to PayPal or the API.

## Files

| File | Screen |
|---|---|
| `Main.dc.html` | Search tab, including a locked seller |
| `Negotiation.dc.html` | Live negotiation: "Round 2 of 3", agent cards, price range, log and chat |
| `SessionEnded.dc.html` | No agreement after 3 rounds, why it ended, and 3 rematch suggestions |
| `canvas.json` | Layout of the three screens on the design canvas (only needed to re-open them in Claude) |

## How to view

Double-click any `.dc.html` file to open it in your browser.

## Rules the screens follow

1. The engine, not the AI, enforces price limits.
2. A negotiation has at most 3 rounds.
3. One active negotiation per seller at a time.
4. Chat can discuss scope but can never change the price.
5. Nobody sees the other side's limit. A buyer sees only their own target and max.

## Look and feel

Colors, fonts and spacing match `web/src/styles/tokens.css`. If a value changes there, update the mockups to match.
