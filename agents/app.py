from __future__ import annotations

import logging
import os
import secrets
import threading
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from negotiation_agent import Closed, PolicyViolation, decide
from paypal_checkout import (
    PayPalError,
    capture_checkout,
    create_checkout,
)

log = logging.getLogger(__name__)

app = FastAPI(
    title="AI Negotiation & PayPal Checkout System",
    description=(
        "Hackathon prototype combining algorithmic negotiation, "
        "optional Gemini explanations, and PayPal payments."
    ),
    version="1.1.0",
)

FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

_DEALS: dict[str, dict[str, Any]] = {}
_ORDER_TO_DEAL: dict[str, str] = {}

_LOCK = threading.Lock()


class NegotiationRequest(BaseModel):
    role: str = Field(min_length=1, max_length=16)
    limits: dict[str, Any]
    scope: dict[str, Any]
    history: list[dict[str, Any]] = Field(default_factory=list)
    use_llm: bool = False


class CheckoutRequest(BaseModel):
    deal_id: str = Field(min_length=1, max_length=128)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "negotiation-api",
    }


@app.post("/api/negotiate")
def api_negotiate(req: NegotiationRequest):

    payload = {
        "role": req.role.strip().lower(),
        "limits": req.limits,
        "scope": req.scope,
        "history": req.history,
    }

    try:
        result = decide(
            payload,
            use_llm=req.use_llm,
        )

    except Closed as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from None

    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid negotiation input: {exc!s}",
        ) from None

    except PolicyViolation:
        log.exception(
            "Negotiation policy validation failed. Role=%s",
            payload["role"],
        )

        raise HTTPException(
            status_code=500,
            detail="Negotiation policy check failed.",
        ) from None

    if (
        not isinstance(result, dict)
        or result.get("action") not in {
            "offer",
            "accept",
            "reject",
        }
    ):
        log.error("Negotiation agent returned an invalid decision.")

        raise HTTPException(
            status_code=500,
            detail="Negotiation service returned an invalid decision.",
        )
    
    if result["action"] == "accept":

        deal_id = secrets.token_urlsafe(16)

        deal = {
            "decision": dict(result),
            "status": "accepted",
            "checkout": None,
            "capture": None,
            "checkout_state": "idle",
            "capture_state": "idle",
        }

        with _LOCK:
            _DEALS[deal_id] = deal

        result = {
            **result,
            "deal_id": deal_id,
        }

    return result

@app.post("/api/checkout")
def api_create_checkout(req: CheckoutRequest):

    deal_id = req.deal_id.strip()

    if not deal_id:
        raise HTTPException(
            status_code=422,
            detail="deal_id is required.",
        )

    with _LOCK:

        deal = _DEALS.get(deal_id)

        if deal is None:
            raise HTTPException(
                status_code=404,
                detail="Unknown deal.",
            )
        
        if deal["checkout"] is not None:
            return deal["checkout"]

        if deal["checkout_state"] == "creating":
            raise HTTPException(
                status_code=409,
                detail=(
                    "Checkout creation is already in progress. "
                    "Please retry."
                ),
            )

        if deal["status"] != "accepted":
            raise HTTPException(
                status_code=409,
                detail="This deal is not available for checkout.",
            )

        deal["checkout_state"] = "creating"

        decision = dict(deal["decision"])

    try:

        checkout = create_checkout(
            decision,
            deal_id=deal_id,
        )

    except PayPalError as exc:

        with _LOCK:
            current = _DEALS.get(deal_id)

            if current and current["checkout_state"] == "creating":
                current["checkout_state"] = "idle"

        log.warning(
            "PayPal checkout creation failed for deal %s: %s",
            deal_id,
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from None

    except Exception:

        with _LOCK:
            current = _DEALS.get(deal_id)

            if current and current["checkout_state"] == "creating":
                current["checkout_state"] = "idle"

        log.exception(
            "Unexpected checkout error for deal %s",
            deal_id,
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to create PayPal checkout at this time.",
        ) from None

    with _LOCK:

        current = _DEALS.get(deal_id)

        if current is None:
            raise HTTPException(
                status_code=404,
                detail="Unknown deal.",
            )

        if current["checkout"] is None:

            current["checkout"] = checkout
            current["status"] = "pending"
            current["checkout_state"] = "created"

            _ORDER_TO_DEAL[checkout["order_id"]] = deal_id

        return current["checkout"]


@app.get("/paypal/return")
def api_paypal_return(
    token: str = Query(min_length=5, max_length=64),
):

    with _LOCK:

        deal_id = _ORDER_TO_DEAL.get(token)

        if deal_id is None:
            raise HTTPException(
                status_code=404,
                detail="Unknown PayPal order.",
            )

        deal = _DEALS.get(deal_id)

        if deal is None or deal["checkout"] is None:
            raise HTTPException(
                status_code=404,
                detail="Unknown deal for PayPal order.",
            )

        if deal["status"] == "paid":
            return {
                "status": "success",
                "deal_id": deal_id,
                "capture_details": deal["capture"],
            }

        if deal["capture_state"] == "capturing":
            raise HTTPException(
                status_code=409,
                detail=(
                    "Payment confirmation is already in progress. "
                    "Please retry."
                ),
            )

        deal["capture_state"] = "capturing"

        expected_amount = deal["checkout"]["amount"]
        expected_currency = deal["checkout"]["currency"]

    try:

        capture = capture_checkout(
            token,
            expected_amount=expected_amount,
            expected_currency=expected_currency,
            expected_deal_id=deal_id,
        )

    except PayPalError as exc:

        with _LOCK:
            current = _DEALS.get(deal_id)

            if current and current["capture_state"] == "capturing":
                current["capture_state"] = "idle"

        log.warning(
            "PayPal capture was not confirmed for deal %s: %s",
            deal_id,
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from None

    except Exception:

        with _LOCK:
            current = _DEALS.get(deal_id)

            if current and current["capture_state"] == "capturing":
                current["capture_state"] = "idle"

        log.exception(
            "Unexpected PayPal capture error for deal %s",
            deal_id,
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to verify PayPal payment at this time.",
        ) from None

    with _LOCK:

        current = _DEALS.get(deal_id)

        if current is None:
            raise HTTPException(
                status_code=404,
                detail="Unknown deal.",
            )

        current["capture"] = capture
        current["status"] = "paid"
        current["capture_state"] = "completed"

        return {
            "status": "success",
            "deal_id": deal_id,
            "capture_details": capture,
        }


@app.get("/paypal/cancel")
def api_paypal_cancel():

    return {
        "status": "cancelled",
        "message": "PayPal checkout was cancelled by the user.",
    }