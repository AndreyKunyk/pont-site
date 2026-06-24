from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import re
import sqlite3
import threading
import uuid

import requests

app = Flask(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://pont.website").rstrip("/")
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        f"{FRONTEND_URL},http://localhost:5500,http://127.0.0.1:5500",
    ).split(",")
    if origin.strip()
]
CORS(app, resources={r"/*": {"origins": allowed_origins}})

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

YOOKASSA_SHOP_ID = os.getenv("YOOKASSA_SHOP_ID")
YOOKASSA_SECRET_KEY = os.getenv("YOOKASSA_SECRET_KEY")
YOOKASSA_API_URL = "https://api.yookassa.ru/v3"

DB_PATH = os.getenv("PAYMENTS_DB_PATH", "payments.db")
PAYMENT_LOCK = threading.Lock()

PROMO_CODE = "OVCHINNIKOV"
PROMO_DISCOUNT = Decimal("0.20")
BONUS_RATE = Decimal("0.05")

PRODUCT_PRICES = {
    "Сен-Мишель": 480,
    "Мон-Моди": 690,
    "Фантанини": 570,
    "Крутини": 580,
    "Миникюр": 330,
    "Картофель фри": 150,
    "Сырные палочки": 200,
    "Луковые кольца": 150,
    "Батат": 250,
    "Креветки": 330,
    "Фирменный соус": 60,
    "Кетчуп": 60,
    "Чесночный соус": 60,
    "Сырный соус": 60,
    "Кисло-сладкий соус": 60,
}

SER_BASE_NAME = "Сэр-Жермен"
SER_BASE_PRICE = 590
SER_OPTIONS = {
    "халапеньо x2": 50,
    "сыр": 60,
    "котлета": 150,
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=15)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_db() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS payments (
                payment_id TEXT PRIMARY KEY,
                order_id TEXT UNIQUE NOT NULL,
                order_json TEXT NOT NULL,
                status TEXT NOT NULL,
                telegram_notified INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )


init_db()


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    if len(digits) == 10:
        digits = "7" + digits
    return digits[:11]


def generate_order_id() -> str:
    now = datetime.now()
    return f"K{now:%y%m%d}-{uuid.uuid4().hex[:4].upper()}"


def get_product_price(name: str) -> int:
    if name in PRODUCT_PRICES:
        return PRODUCT_PRICES[name]

    parts = [part.strip() for part in name.split(" + ")]
    if not parts or parts[0] != SER_BASE_NAME:
        raise ValueError(f"Неизвестный товар: {name}")

    price = SER_BASE_PRICE
    used_options: set[str] = set()

    for option in parts[1:]:
        if option not in SER_OPTIONS or option in used_options:
            raise ValueError(f"Недопустимая добавка для {SER_BASE_NAME}: {option}")
        used_options.add(option)
        price += SER_OPTIONS[option]

    return price


def round_half_up(value: Decimal) -> int:
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def validate_order(data: dict) -> dict:
    raw_items = data.get("items", [])
    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError("Корзина пуста")
    if len(raw_items) > 50:
        raise ValueError("Слишком много позиций в заказе")

    validated_items = []
    subtotal = 0
    items_count = 0

    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise ValueError("Некорректный товар в корзине")

        name = str(raw_item.get("name", "")).strip()
        try:
            quantity = int(raw_item.get("quantity", 0))
        except (TypeError, ValueError) as error:
            raise ValueError("Некорректное количество товара") from error

        if quantity < 1 or quantity > 20:
            raise ValueError("Количество одного товара должно быть от 1 до 20")

        price = get_product_price(name)
        line_total = price * quantity
        subtotal += line_total
        items_count += quantity
        validated_items.append(
            {
                "name": name,
                "quantity": quantity,
                "price": price,
                "line_total": line_total,
            }
        )

    customer = data.get("customer", {})
    if not isinstance(customer, dict):
        customer = {}

    customer_name = str(customer.get("name", "Не указано")).strip()[:80] or "Не указано"
    customer_phone_display = str(customer.get("phone", "")).strip()[:30]
    customer_phone = normalize_phone(customer_phone_display)
    customer_comment = str(customer.get("comment", "")).strip()[:300]

    if len(customer_phone) != 11:
        raise ValueError("Не указан корректный телефон")

    promo = str(data.get("promo", "")).strip().upper()
    promo_applied = promo == PROMO_CODE
    discount = round_half_up(Decimal(subtotal) * PROMO_DISCOUNT) if promo_applied else 0
    total = subtotal - discount
    bonus = int(Decimal(subtotal) * BONUS_RATE)

    client_order_id = str(data.get("orderId", "")).strip().upper()
    order_id = (
        client_order_id
        if re.fullmatch(r"K\d{6}-[A-Z0-9]{3,8}", client_order_id)
        else generate_order_id()
    )

    return {
        "order_id": order_id,
        "items": validated_items,
        "items_count": items_count,
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
        "bonus": bonus,
        "promo": PROMO_CODE if promo_applied else "",
        "customer": {
            "name": customer_name,
            "phone": customer_phone_display,
            "phone_digits": customer_phone,
            "comment": customer_comment,
        },
    }


def build_telegram_message(order: dict, payment_method: str, payment_id: str = "") -> str:
    paid_online = payment_method == "online"
    lines = ["Новый заказ с сайта KUNIK", f"Номер заказа: #{order['order_id']}"]

    if paid_online:
        lines.extend(["Оплата: онлайн", "Статус: ОПЛАЧЕНО"])
        if payment_id:
            lines.append(f"ID платежа: {payment_id}")
    else:
        lines.extend(["Оплата: при получении", "Статус: ожидает оплаты"])

    lines.extend(
        [
            "",
            f"Клиент: {order['customer']['name']}",
            f"Телефон: {order['customer']['phone']}",
        ]
    )

    if order["customer"]["comment"]:
        lines.append(f"Комментарий: {order['customer']['comment']}")

    lines.append("")
    for index, item in enumerate(order["items"], start=1):
        lines.append(
            f"{index}. {item['name']} — {item['quantity']} шт. — {item['line_total']} ₽"
        )

    lines.extend(
        [
            "",
            f"Товаров: {order['items_count']}",
            f"Бонусы: +{order['bonus']} ₽",
        ]
    )

    if order["promo"] and order["discount"] > 0:
        lines.append(f"Промокод: {order['promo']}")
        lines.append(f"Скидка: -{order['discount']} ₽")

    lines.append(f"Итого: {order['total']} ₽")
    return "\n".join(lines)


def send_telegram_message(message: str) -> None:
    if not BOT_TOKEN or not CHAT_ID:
        raise RuntimeError("Не настроены переменные Telegram")

    response = requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        json={"chat_id": CHAT_ID, "text": message},
        timeout=20,
    )
    response.raise_for_status()


def yookassa_is_configured() -> bool:
    return bool(YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY)


def yookassa_request(method: str, path: str, **kwargs) -> requests.Response:
    if not yookassa_is_configured():
        raise RuntimeError("ЮKassa не настроена на сервере")

    headers = kwargs.pop("headers", {})
    headers.setdefault("Content-Type", "application/json")

    response = requests.request(
        method,
        f"{YOOKASSA_API_URL}{path}",
        auth=(YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY),
        headers=headers,
        timeout=25,
        **kwargs,
    )
    return response


def save_payment(payment_id: str, order: dict, status: str) -> None:
    payload = json.dumps(order, ensure_ascii=False, separators=(",", ":"))
    now = utc_now()
    with get_db() as connection:
        connection.execute(
            """
            INSERT INTO payments (
                payment_id, order_id, order_json, status,
                telegram_notified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 0, ?, ?)
            ON CONFLICT(payment_id) DO UPDATE SET
                order_id = excluded.order_id,
                order_json = excluded.order_json,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (payment_id, order["order_id"], payload, status, now, now),
        )


def update_payment_status(payment_id: str, status: str) -> None:
    with get_db() as connection:
        connection.execute(
            "UPDATE payments SET status = ?, updated_at = ? WHERE payment_id = ?",
            (status, utc_now(), payment_id),
        )


def get_saved_payment(payment_id: str = "", order_id: str = "") -> sqlite3.Row | None:
    with get_db() as connection:
        if payment_id:
            return connection.execute(
                "SELECT * FROM payments WHERE payment_id = ?", (payment_id,)
            ).fetchone()
        if order_id:
            return connection.execute(
                "SELECT * FROM payments WHERE order_id = ?", (order_id,)
            ).fetchone()
    return None


def order_to_metadata(order: dict) -> dict:
    compact_items = [
        {"n": item["name"], "q": item["quantity"], "p": item["price"]}
        for item in order["items"]
    ]
    return {
        "order_id": order["order_id"],
        "customer_name": order["customer"]["name"],
        "customer_phone": order["customer"]["phone"],
        "customer_comment": order["customer"]["comment"],
        "promo": order["promo"],
        "items": json.dumps(compact_items, ensure_ascii=False, separators=(",", ":")),
    }


def order_from_metadata(metadata: dict, amount_value: str) -> dict:
    items_raw = json.loads(metadata.get("items", "[]"))
    source = {
        "items": [
            {
                "name": item.get("n", ""),
                "quantity": item.get("q", 0),
                "price": item.get("p", 0),
            }
            for item in items_raw
        ],
        "promo": metadata.get("promo", ""),
        "orderId": metadata.get("order_id", ""),
        "customer": {
            "name": metadata.get("customer_name", "Не указано"),
            "phone": metadata.get("customer_phone", ""),
            "comment": metadata.get("customer_comment", ""),
        },
    }
    order = validate_order(source)
    expected = Decimal(str(order["total"])).quantize(Decimal("0.00"))
    received = Decimal(str(amount_value)).quantize(Decimal("0.00"))
    if expected != received:
        raise ValueError("Сумма платежа не совпадает с суммой заказа")
    return order


def get_payment_from_yookassa(payment_id: str) -> dict:
    response = yookassa_request("GET", f"/payments/{payment_id}")
    if response.status_code >= 400:
        raise RuntimeError(f"ЮKassa вернула ошибку {response.status_code}")
    return response.json()


def finalize_paid_payment(payment: dict) -> dict:
    payment_id = str(payment.get("id", ""))
    if not payment_id or payment.get("status") != "succeeded" or not payment.get("paid"):
        raise ValueError("Платеж ещё не подтверждён")

    with PAYMENT_LOCK:
        saved = get_saved_payment(payment_id=payment_id)
        if saved and saved["telegram_notified"]:
            return json.loads(saved["order_json"])

        if saved:
            order = json.loads(saved["order_json"])
        else:
            order = order_from_metadata(
                payment.get("metadata") or {},
                (payment.get("amount") or {}).get("value", "0"),
            )
            save_payment(payment_id, order, "succeeded")

        expected_amount = Decimal(str(order["total"])).quantize(Decimal("0.00"))
        actual_amount = Decimal(
            str((payment.get("amount") or {}).get("value", "0"))
        ).quantize(Decimal("0.00"))
        if expected_amount != actual_amount:
            raise ValueError("Сумма подтвержденного платежа не совпадает с заказом")

        send_telegram_message(build_telegram_message(order, "online", payment_id))

        with get_db() as connection:
            connection.execute(
                """
                UPDATE payments
                SET status = 'succeeded', telegram_notified = 1, updated_at = ?
                WHERE payment_id = ?
                """,
                (utc_now(), payment_id),
            )

        return order


@app.get("/health")
def health():
    return jsonify(
        {
            "ok": True,
            "telegramConfigured": bool(BOT_TOKEN and CHAT_ID),
            "yookassaConfigured": yookassa_is_configured(),
        }
    )


@app.post("/send-order")
def send_order():
    try:
        order = validate_order(request.get_json(silent=True) or {})
        send_telegram_message(build_telegram_message(order, "cash"))
        return jsonify({"ok": True, "orderId": order["order_id"]})
    except ValueError as error:
        return jsonify({"ok": False, "error": str(error)}), 400
    except Exception as error:
        app.logger.exception("Не удалось отправить заказ")
        return jsonify({"ok": False, "error": str(error)}), 500


@app.post("/create-payment")
def create_payment():
    try:
        if not yookassa_is_configured():
            return jsonify({"ok": False, "error": "Онлайн-оплата пока не настроена"}), 503

        order = validate_order(request.get_json(silent=True) or {})
        return_url = f"{FRONTEND_URL}/?payment=return&order_id={order['order_id']}"

        payment_payload = {
            "amount": {
                "value": f"{Decimal(order['total']).quantize(Decimal('0.00'))}",
                "currency": "RUB",
            },
            "capture": True,
            "confirmation": {
                "type": "redirect",
                "return_url": return_url,
            },
            "description": f"Заказ KUNIK #{order['order_id']}",
            "save_payment_method": False,
            "metadata": order_to_metadata(order),
        }

        response = yookassa_request(
            "POST",
            "/payments",
            headers={"Idempotence-Key": str(uuid.uuid4())},
            json=payment_payload,
        )

        try:
            payment = response.json()
        except ValueError:
            payment = {}

        if response.status_code >= 400:
            description = payment.get("description") or "Не удалось создать платеж"
            app.logger.error("Ошибка ЮKassa %s: %s", response.status_code, payment)
            return jsonify({"ok": False, "error": description}), 502

        confirmation_url = (payment.get("confirmation") or {}).get("confirmation_url")
        payment_id = payment.get("id")
        if not confirmation_url or not payment_id:
            return jsonify({"ok": False, "error": "ЮKassa не вернула ссылку на оплату"}), 502

        save_payment(payment_id, order, payment.get("status", "pending"))

        return jsonify(
            {
                "ok": True,
                "paymentId": payment_id,
                "orderId": order["order_id"],
                "confirmationUrl": confirmation_url,
                "amount": order["total"],
            }
        )
    except ValueError as error:
        return jsonify({"ok": False, "error": str(error)}), 400
    except Exception as error:
        app.logger.exception("Не удалось создать платеж")
        return jsonify({"ok": False, "error": str(error)}), 500


@app.get("/payment-status/<payment_id>")
def payment_status(payment_id: str):
    try:
        payment = get_payment_from_yookassa(payment_id)
        status = payment.get("status", "unknown")
        update_payment_status(payment_id, status)

        order = None
        if status == "succeeded" and payment.get("paid"):
            order = finalize_paid_payment(payment)
        else:
            saved = get_saved_payment(payment_id=payment_id)
            if saved:
                order = json.loads(saved["order_json"])

        return jsonify(
            {
                "ok": True,
                "status": status,
                "paid": bool(payment.get("paid")),
                "orderId": order["order_id"] if order else "",
            }
        )
    except Exception as error:
        app.logger.exception("Не удалось проверить платеж")
        return jsonify({"ok": False, "error": str(error)}), 500


@app.get("/payment-status-by-order/<order_id>")
def payment_status_by_order(order_id: str):
    saved = get_saved_payment(order_id=order_id)
    if not saved:
        return jsonify({"ok": False, "error": "Платеж для заказа не найден"}), 404
    return payment_status(saved["payment_id"])


@app.post("/yookassa-webhook")
def yookassa_webhook():
    try:
        notification = request.get_json(silent=True) or {}
        event = notification.get("event", "")
        payment_object = notification.get("object") or {}
        payment_id = payment_object.get("id", "")

        if not payment_id:
            return "ok", 200

        # Уведомление перепроверяется отдельным запросом к API ЮKassa.
        payment = get_payment_from_yookassa(payment_id)
        status = payment.get("status", "unknown")
        update_payment_status(payment_id, status)

        if event == "payment.succeeded" and status == "succeeded" and payment.get("paid"):
            finalize_paid_payment(payment)

        return "ok", 200
    except Exception:
        app.logger.exception("Ошибка обработки webhook ЮKassa")
        # Возвращаем 500, чтобы ЮKassa повторила доставку уведомления.
        return "error", 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
