from __future__ import annotations

import base64
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from dotenv import load_dotenv


load_dotenv(
    Path(__file__).resolve().parent.parent
    / "backend"
    / ".env"
)


SANDBOX_API = "https://api-m.sandbox.paypal.com"
PRODUCTION_API = "https://api-m.paypal.com"

ORDER_ID_PATTERN = re.compile(r"^[A-Z0-9-]{5,64}$")
CURRENCY_PATTERN = re.compile(r"^[A-Z]{3}$")


class PayPalError(RuntimeError):
    """Safe, user-facing PayPal integration error."""

def _api_base() -> str:

    environment = os.getenv(
        "PAYPAL_ENVIRONMENT",
        "SANDBOX",
    ).strip().upper()

    if environment == "SANDBOX":
        return SANDBOX_API

    if environment == "PRODUCTION":
        return PRODUCTION_API

    raise PayPalError(
        "PAYPAL_ENVIRONMENT must be SANDBOX or PRODUCTION."
    )


def _credentials() -> tuple[str, str]:

    client_id = os.getenv(
        "PAYPAL_CLIENT_ID",
        "",
    ).strip()

    secret = os.getenv(
        "PAYPAL_CLIENT_SECRET",
        "",
    ).strip()

    if not client_id or not secret:
        raise PayPalError(
            "Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET "
            "in your environment."
        )

    return client_id, secret

def _request_json(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict[str, Any] | None = None,
    extra_headers: dict[str, str] | None = None,
) -> dict[str, Any]:

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    if extra_headers:
        headers.update(extra_headers)

    data = (
        None
        if body is None
        else json.dumps(body).encode("utf-8")
    )

    request = urllib.request.Request(
        _api_base() + path,
        data=data,
        headers=headers,
        method=method,
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=20,
        ) as response:

            raw_response = response.read().decode("utf-8")

            payload = (
                json.loads(raw_response)
                if raw_response
                else {}
            )

    except urllib.error.HTTPError as exc:

        try:
            detail = json.loads(
                exc.read().decode("utf-8")
            )

            if not isinstance(detail, dict):
                raise ValueError("Invalid error response")

            message = (
                detail.get("message")
                or detail.get("name")
                or "request rejected"
            )

            details = detail.get("details") or []

            issue = None

            if (
                isinstance(details, list)
                and details
                and isinstance(details[0], dict)
            ):
                issue = details[0].get("issue")

            suffix = f" ({issue})" if issue else ""

        except Exception:

            message = "request rejected"
            suffix = ""

        raise PayPalError(
            f"PayPal API error: {message}{suffix}."
        ) from None

    except (
        urllib.error.URLError,
        TimeoutError,
        json.JSONDecodeError,
        UnicodeError,
    ):

        raise PayPalError(
            "Could not reach PayPal. Check your connection and try again."
        ) from None

    if not isinstance(payload, dict):
        raise PayPalError(
            "PayPal returned an invalid response."
        )

    return payload

def _access_token() -> str:

    client_id, secret = _credentials()

    credentials = (
        f"{client_id}:{secret}"
    ).encode("utf-8")

    request = urllib.request.Request(
        _api_base() + "/v1/oauth2/token",

        data=urllib.parse.urlencode({
            "grant_type": "client_credentials",
        }).encode("utf-8"),

        headers={
            "Accept": "application/json",
            "Accept-Language": "en_US",
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": (
                "Basic "
                + base64.b64encode(credentials).decode("ascii")
            ),
        },

        method="POST",
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=20,
        ) as response:

            payload = json.loads(
                response.read().decode("utf-8")
            )

    except urllib.error.HTTPError:

        raise PayPalError(
            "PayPal authentication failed. "
            "Check your app credentials."
        ) from None

    except (
        urllib.error.URLError,
        TimeoutError,
        json.JSONDecodeError,
        UnicodeError,
    ):

        raise PayPalError(
            "Could not obtain a PayPal access token. "
            "Check your connection."
        ) from None

    if not isinstance(payload, dict):
        raise PayPalError(
            "PayPal returned an invalid authentication response."
        )

    token = payload.get("access_token")

    if not isinstance(token, str) or not token:
        raise PayPalError(
            "PayPal did not return an access token."
        )

    return token


def _money(value: Any) -> str:

    if isinstance(value, bool):
        raise PayPalError(
            "The accepted negotiation price must be a valid amount."
        )

    try:

        amount = Decimal(str(value)).quantize(
            Decimal("0.01")
        )

    except (
        InvalidOperation,
        ValueError,
        TypeError,
    ):

        raise PayPalError(
            "The accepted negotiation price must be a valid amount."
        ) from None

    if not amount.is_finite() or amount <= 0:
        raise PayPalError(
            "The accepted negotiation price must be greater than zero."
        )

    return format(amount, ".2f")


def _validate_redirect_url(
    value: str,
    label: str,
) -> str:

    parsed = urlsplit(value)

    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
    ):

        raise PayPalError(
            f"{label} must be an absolute HTTP or HTTPS URL."
        )

    return value


def _validate_order_id(order_id: str) -> None:

    if (
        not isinstance(order_id, str)
        or not ORDER_ID_PATTERN.fullmatch(order_id)
    ):

        raise PayPalError(
            "A valid PayPal order ID is required."
        )


def create_checkout(
    decision: dict[str, Any],
    *,
    currency: str | None = None,
    deal_id: str | None = None,
    return_url: str | None = None,
    cancel_url: str | None = None,
) -> dict[str, Any]:

    if (
        not isinstance(decision, dict)
        or decision.get("action") != "accept"
    ):

        raise PayPalError(
            "Checkout can only be created after a negotiation is accepted."
        )

    scope = decision.get("scope")

    if (
        not isinstance(scope, list)
        or not scope
        or any(
            not isinstance(item, str) or not item.strip()
            for item in scope
        )
    ):

        raise PayPalError(
            "Accepted negotiation must contain a non-empty, valid scope."
        )

    scope = [
        item.strip()
        for item in scope
    ]

    amount = _money(
        decision.get("price")
    )

    currency_code = (
        currency or os.getenv("PAYPAL_CURRENCY", "")
    ).strip().upper()

    if not CURRENCY_PATTERN.fullmatch(currency_code):
        raise PayPalError(
            "Set PAYPAL_CURRENCY to a three-letter currency code, "
            "such as USD or PHP."
        )

    return_url = _validate_redirect_url(
        return_url or os.getenv(
            "PAYPAL_RETURN_URL",
            "http://localhost:8000/paypal/return",
        ),
        "PAYPAL_RETURN_URL",
    )

    cancel_url = _validate_redirect_url(
        cancel_url or os.getenv(
            "PAYPAL_CANCEL_URL",
            "http://localhost:8000/paypal/cancel",
        ),
        "PAYPAL_CANCEL_URL",
    )

    if deal_id is not None:

        if (
            not isinstance(deal_id, str)
            or not deal_id
            or len(deal_id) > 255
        ):

            raise PayPalError(
                "A valid deal ID is required for checkout."
            )

    token = _access_token()

    unit = {
        "description": (
            "Negotiated agreement: "
            + ", ".join(scope)[:120]
        ),

        "amount": {
            "currency_code": currency_code,
            "value": amount,
        },
    }

    if deal_id:
        unit["custom_id"] = deal_id

    headers = (
        {
            "PayPal-Request-Id": f"create-{deal_id}",
        }
        if deal_id
        else None
    )

    order = _request_json(
        "POST",
        "/v2/checkout/orders",
        token=token,
        extra_headers=headers,

        body={
            "intent": "CAPTURE",

            "purchase_units": [
                unit,
            ],

            "application_context": {
                "return_url": return_url,
                "cancel_url": cancel_url,
                "user_action": "PAY_NOW",
            },
        },
    )

    links = order.get("links", [])

    if not isinstance(links, list):
        links = []

    approval_url = next(
        (
            link.get("href")
            for link in links
            if (
                isinstance(link, dict)
                and link.get("rel") in {
                    "payer-action",
                    "approve",
                }
                and isinstance(link.get("href"), str)
            )
        ),
        None,
    )

    order_id = order.get("id")

    if (
        not isinstance(order_id, str)
        or not ORDER_ID_PATTERN.fullmatch(order_id)
        or not approval_url
    ):

        raise PayPalError(
            "PayPal created no usable order or approval link."
        )

    approval_parts = urlsplit(approval_url)

    approval_host = (
        approval_parts.hostname or ""
    ).lower()

    if (
        approval_parts.scheme != "https"
        or not (
            approval_host == "paypal.com"
            or approval_host.endswith(".paypal.com")
        )
    ):

        raise PayPalError(
            "PayPal returned an invalid approval link."
        )

    return {
        "order_id": order_id,
        "status": order.get("status", "CREATED"),
        "approval_url": approval_url,
        "amount": amount,
        "currency": currency_code,
    }


def _purchase_unit(
    order: dict[str, Any],
) -> dict[str, Any]:

    units = order.get("purchase_units")

    if (
        not isinstance(units, list)
        or len(units) != 1
        or not isinstance(units[0], dict)
    ):

        raise PayPalError(
            "PayPal order does not contain the expected purchase unit."
        )

    return units[0]


def _verify_order_details(
    order: dict[str, Any],
    *,
    expected_amount: str | None,
    expected_currency: str | None,
    expected_deal_id: str | None,
) -> dict[str, Any]:

    unit = _purchase_unit(order)

    amount = unit.get("amount")

    if not isinstance(amount, dict):
        raise PayPalError(
            "PayPal order is missing its amount details."
        )

    if expected_amount is not None:

        try:

            actual = Decimal(
                str(amount.get("value"))
            )

            expected = Decimal(
                _money(expected_amount)
            )

            same_amount = (
                actual.is_finite()
                and actual == expected
            )

        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ):

            same_amount = False

        if not same_amount:
            raise PayPalError(
                "The PayPal order amount does not match the accepted deal."
            )

    if (
        expected_currency is not None
        and amount.get("currency_code") != expected_currency
    ):

        raise PayPalError(
            "The PayPal order currency does not match the accepted deal."
        )

    # Verify the order belongs to the correct deal.
    if (
        expected_deal_id is not None
        and unit.get("custom_id") != expected_deal_id
    ):

        raise PayPalError(
            "The PayPal order does not belong to this accepted deal."
        )

    return unit

def _capture_summary(
    order: dict[str, Any],
    order_id: str,
    *,
    expected_amount: str | None,
    expected_currency: str | None,
) -> dict[str, Any]:

    if order.get("status") != "COMPLETED":
        raise PayPalError(
            "PayPal has not confirmed a completed capture."
        )

    unit = _verify_order_details(
        order,
        expected_amount=expected_amount,
        expected_currency=expected_currency,
        expected_deal_id=None,
    )

    payments = unit.get("payments") or {}

    captures = (
        payments.get("captures")
        if isinstance(payments, dict)
        else None
    )

    if not isinstance(captures, list) or not captures:

        raise PayPalError(
            "PayPal marked the order completed but returned no capture details."
        )

    verified_captures = []
    captured_total = Decimal("0.00")

    for capture in captures:

        if (
            not isinstance(capture, dict)
            or capture.get("status") != "COMPLETED"
        ):

            raise PayPalError(
                "PayPal returned a capture that is not completed."
            )

        captured_amount = capture.get("amount") or {}

        if not isinstance(captured_amount, dict):
            raise PayPalError(
                "PayPal returned invalid capture amount details."
            )

        try:

            value = Decimal(
                str(captured_amount.get("value"))
            )

        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ):

            raise PayPalError(
                "PayPal returned an invalid capture amount."
            ) from None

        if not value.is_finite() or value <= 0:
            raise PayPalError(
                "PayPal returned an invalid capture amount."
            )

        if (
            expected_currency is not None
            and captured_amount.get("currency_code") != expected_currency
        ):

            raise PayPalError(
                "Captured payment currency does not match the accepted deal."
            )

        captured_total += value

        verified_captures.append({
            "capture_id": capture.get("id"),
            "status": capture.get("status"),
            "amount": captured_amount,
        })

    if expected_amount is not None:

        expected = Decimal(
            _money(expected_amount)
        )

        if captured_total != expected:

            raise PayPalError(
                "The captured payment total does not match the accepted deal."
            )

    return {
        "order_id": order.get("id", order_id),
        "status": order.get("status"),
        "captures": verified_captures,
    }


def capture_checkout(
    order_id: str,
    *,
    expected_amount: str | None = None,
    expected_currency: str | None = None,
    expected_deal_id: str | None = None,
) -> dict[str, Any]:

    _validate_order_id(order_id)

    if expected_amount is not None:
        expected_amount = _money(expected_amount)

    if expected_currency is not None:

        expected_currency = (
            expected_currency.strip().upper()
        )

        if not CURRENCY_PATTERN.fullmatch(expected_currency):
            raise PayPalError(
                "Expected currency must be a three-letter currency code."
            )

    token = _access_token()

    order = _request_json(
        "GET",
        f"/v2/checkout/orders/{order_id}",
        token=token,
    )

    if order.get("id") not in {None, order_id}:
        raise PayPalError(
            "PayPal returned an unexpected order ID."
        )

    _verify_order_details(
        order,
        expected_amount=expected_amount,
        expected_currency=expected_currency,
        expected_deal_id=expected_deal_id,
    )

    if order.get("status") == "COMPLETED":

        return _capture_summary(
            order,
            order_id,
            expected_amount=expected_amount,
            expected_currency=expected_currency,
        )

    if order.get("status") != "APPROVED":

        raise PayPalError(
            "This PayPal order is not approved yet; no capture was attempted."
        )

    result = _request_json(
        "POST",
        f"/v2/checkout/orders/{order_id}/capture",
        token=token,
        body={},
        extra_headers={
            "PayPal-Request-Id": f"capture-{order_id}",
        },
    )

    return _capture_summary(
        result,
        order_id,
        expected_amount=expected_amount,
        expected_currency=expected_currency,
    )