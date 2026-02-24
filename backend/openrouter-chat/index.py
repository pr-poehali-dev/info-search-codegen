"""
Прокси для OpenRouter API с поддержкой чата, веб-поиска и анализа.
"""

import json
import os
import urllib.request
import urllib.error


SYSTEM_PROMPT = """You are Nexus AI — a universal intelligent assistant. You can:
1. Answer questions on any topic with deep knowledge
2. Write high-quality code in any programming language
3. Search and analyze information from the internet (when web_search results are provided)
4. Analyze data, documents, and complex topics
5. Help with creative tasks, writing, translation

Rules:
- Write clean, production-ready code with proper formatting
- Include type hints/annotations where applicable
- Use fenced code blocks with correct language tags for code
- Keep explanations concise but helpful (3-5 sentences)
- If web search results are provided in the conversation, use them to give accurate, up-to-date answers with source references
- If the user writes in Russian, respond in Russian
- Be friendly, helpful, and thorough
- For analysis tasks, provide structured insights with bullet points
- When citing web sources, mention the source name"""


def handler(event: dict, context) -> dict:
    """Обработка чат-запросов через OpenRouter API"""
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }

    cors = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return {
            "statusCode": 500,
            "headers": cors,
            "body": json.dumps({"error": "OPENROUTER_API_KEY не настроен. Добавьте ключ в настройках проекта."}),
        }

    body = json.loads(event.get("body") or "{}")
    messages = body.get("messages", [])
    model = body.get("model", "google/gemini-2.0-flash-001")
    max_tokens = min(body.get("max_tokens", 8192), 32768)
    context_limit = body.get("context_limit", 40)

    if not messages:
        return {
            "statusCode": 400,
            "headers": cors,
            "body": json.dumps({"error": "messages обязательны"}),
        }

    trimmed = messages[-context_limit:] if len(messages) > context_limit else messages

    payload = {
        "model": model,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + trimmed,
        "max_tokens": max_tokens,
        "temperature": 0.4,
    }

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://poehali.dev",
            "X-Title": "Nexus AI Assistant",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else "{}"
        try:
            err_data = json.loads(error_body)
            err_msg = err_data.get("error", {}).get("message", str(e))
        except Exception:
            err_msg = str(e)
        return {
            "statusCode": e.code,
            "headers": cors,
            "body": json.dumps({"error": f"OpenRouter: {err_msg}"}),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors,
            "body": json.dumps({"error": f"Ошибка подключения: {str(e)}"}),
        }

    choices = data.get("choices", [])
    if not choices:
        return {
            "statusCode": 500,
            "headers": cors,
            "body": json.dumps({"error": "Пустой ответ от модели"}),
        }

    content = choices[0].get("message", {}).get("content", "")
    usage = data.get("usage", {})

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({
            "content": content,
            "model": data.get("model", model),
            "usage": usage,
        }),
    }
