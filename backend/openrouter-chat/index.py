"""
Прокси-функция для отправки сообщений в OpenRouter API.
Поддерживает любую модель, доступную на openrouter.ai.
Системный промпт настроен для качественной генерации кода.
"""

import json
import os
import urllib.request
import urllib.error


SYSTEM_PROMPT = """You are an expert software engineer and coding assistant. Your primary goal is to write high-quality, production-ready code.

Rules for code generation:
- Always use proper formatting and indentation
- Include type hints/annotations where applicable (Python, TypeScript)
- Write clean, readable, idiomatic code for the given language
- Add brief inline comments only for non-obvious logic
- Prefer modern language features and best practices
- When showing code, wrap it in fenced code blocks with the correct language tag
- After code, give a SHORT explanation (2-4 sentences max) of what it does

If the user writes in Russian, respond in Russian. Keep explanations concise."""


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
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

    body = json.loads(event.get("body") or "{}")
    messages = body.get("messages", [])
    model = body.get("model", "anthropic/claude-3.5-haiku")
    max_tokens = body.get("max_tokens", 8192)
    context_limit = body.get("context_limit", 32)

    if not messages:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": "messages обязательны"}),
        }

    # Ограничиваем историю по context_limit (количество сообщений)
    trimmed = messages[-context_limit:] if len(messages) > context_limit else messages

    payload = {
        "model": model,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + trimmed,
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://poehali.dev",
            "X-Title": "Poehali Code Agent",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        "body": json.dumps({
            "content": content,
            "model": data.get("model", model),
            "usage": usage,
        }),
    }
