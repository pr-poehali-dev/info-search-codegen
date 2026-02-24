"""
Загружает список доступных моделей с OpenRouter API.
Возвращает отфильтрованный и отсортированный список с ценами и контекстом.
"""

import json
import os
import urllib.request


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": "OPENROUTER_API_KEY не настроен"}),
        }

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/models",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="GET",
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    models = []
    for m in data.get("data", []):
        ctx = m.get("context_length", 0)
        pricing = m.get("pricing", {})
        prompt_price = float(pricing.get("prompt", 0) or 0)

        models.append({
            "id": m["id"],
            "name": m.get("name", m["id"]),
            "context_length": ctx,
            "prompt_price": prompt_price,
            "description": m.get("description", ""),
            "top_provider": m.get("top_provider", {}),
        })

    # Сортировка: бесплатные вперёд, потом по размеру контекста
    models.sort(key=lambda x: (x["prompt_price"] > 0, -x["context_length"]))

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        "body": json.dumps({"models": models, "total": len(models)}),
    }
