from __future__ import annotations

import logging
import secrets
import threading
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from negotiation_agent import decide, Closed, PolicyViolation
from paypal_checkout import create_checkout, capture_checkout, PayPalError

log = logging.getLogger(__name__)

app = FastAPI(
    title="AI Negotiation & PayPal Checkout System",
    description="Hackathon Prototype combining LLM/Algorithmic Negotiation with PayPal Sandbox Payments.",
    version="1.0.0",
)

_DEALS: dict[str, dict] = {}
_ORDER_TO_DEAL: dict[str, str] = {}
_LOCK = threading.Lock()


class NegotiationRequest(BaseModel):
    role: str
    limits: dict
    scope: dict
    history: List[dict] = Field(default_factory=list)
    use_llm: bool = False


class CheckoutRequest(BaseModel):
    deal_id: str  

@app.post("/api/negotiate")
def api_negotiate(req: NegotiationRequest):
    payload = {"role": req.role, "limits": req.limits, "scope": req.scope, "history": req.history}
    try:
        result = decide(payload, use_llm=req.use_llm)
    except Closed as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (ValueError, KeyError, TypeError) as e:
        raise HTTPException(status_code=422, detail=f"Invalid negotiation input: {e!s}")
    except PolicyViolation:
        log.error("PolicyViolation for payload role=%s", req.role)
        raise HTTPException(status_code=500, detail="Negotiation policy check failed.")
    if result["action"] == "accept":
        deal_id = secrets.token_urlsafe(16)
        with _LOCK:
            _DEALS[deal_id] = {"decision": result, "status": "accepted", "checkout": None, "capture": None}
        result = {**result, "deal_id": deal_id}
    return result


@app.post("/api/checkout")
def api_create_checkout(req: CheckoutRequest):
    with _LOCK:
        deal = _DEALS.get(req.deal_id)
        if deal is None:
            raise HTTPException(status_code=404, detail="Unknown deal.")
        if deal["checkout"] is not None:
            return deal["checkout"]
        try:
            checkout = create_checkout(deal["decision"], deal_id=req.deal_id)
        except PayPalError as e:
            raise HTTPException(status_code=400, detail=str(e))
        deal.update(status="pending", checkout=checkout)
        _ORDER_TO_DEAL[checkout["order_id"]] = req.deal_id
        return checkout


@app.get("/paypal/return")
def api_paypal_return(token: str):
    with _LOCK:
        deal_id = _ORDER_TO_DEAL.get(token)
        if deal_id is None:
            raise HTTPException(status_code=404, detail="Unknown PayPal order.")
        deal = _DEALS[deal_id]
        if deal["status"] != "paid":
            try:
                deal["capture"] = capture_checkout(
                    token,
                    expected_amount=deal["checkout"]["amount"],
                    expected_currency=deal["checkout"]["currency"],
                )
            except PayPalError as e:
                raise HTTPException(status_code=400, detail=str(e))
            deal["status"] = "paid"
        return {"status": "success", "deal_id": deal_id, "capture_details": deal["capture"]}


@app.get("/paypal/cancel")
def api_paypal_cancel():
    return {"status": "cancelled", "message": "PayPal checkout was cancelled by the user."}