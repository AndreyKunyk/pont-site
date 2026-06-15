from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests

app = Flask(__name__)
CORS(app)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


@app.route("/send-order", methods=["POST"])
def send_order():
    try:
        data = request.get_json() or {}

        items = data.get("items", [])
        items_count = data.get("itemsCount", 0)
        bonus = data.get("bonus", 0)
        discount = data.get("discount", 0)
        total = data.get("total", 0)
        promo = data.get("promo", "")

        customer = data.get("customer", {})
        customer_name = customer.get("name", "Не указано")
        customer_phone = customer.get("phone", "")
        customer_comment = customer.get("comment", "")

        if not items:
            return jsonify({"ok": False, "error": "Корзина пуста"}), 400

        if not customer_phone:
            return jsonify({"ok": False, "error": "Не указан телефон"}), 400

        message = "Новый заказ с сайта PONT\n\n"
        message += f"Клиент: {customer_name}\n"
        message += f"Телефон: {customer_phone}\n"

        if customer_comment:
            message += f"Комментарий: {customer_comment}\n"

        message += "\n"

        for index, item in enumerate(items, start=1):
            name = item.get("name", "Без названия")
            quantity = item.get("quantity", 1)
            price = item.get("price", 0)
            line_total = quantity * price
            message += f"{index}. {name} — {quantity} шт. — {line_total} ₽\n"

        message += f"\nТоваров: {items_count}"
        message += f"\nБонусы: +{bonus} ₽"

        if promo and discount > 0:
            message += f"\nПромокод: {promo}"
            message += f"\nСкидка: -{discount} ₽"

        message += f"\nИтого: {total} ₽"

        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": CHAT_ID,
            "text": message
        }

        response = requests.post(url, json=payload, timeout=15)
        response.raise_for_status()

        return jsonify({"ok": True})

    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
