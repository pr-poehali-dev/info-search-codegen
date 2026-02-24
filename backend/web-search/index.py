"""
Поиск информации в интернете через DuckDuckGo HTML-парсинг.
Возвращает результаты поиска для интеграции с чат-ассистентом.
"""

import json
import urllib.request
import urllib.parse
import urllib.error
import re


def extract_results(html: str) -> list:
    """Парсим результаты из HTML DuckDuckGo"""
    results = []

    blocks = re.findall(
        r'<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)</a>.*?'
        r'<a[^>]+class="result__snippet"[^>]*>(.*?)</a>',
        html,
        re.DOTALL
    )

    for url, title, snippet in blocks:
        clean_title = re.sub(r'<[^>]+>', '', title).strip()
        clean_snippet = re.sub(r'<[^>]+>', '', snippet).strip()
        clean_url = urllib.parse.unquote(url)

        if clean_title and clean_url:
            final_url = clean_url
            uddg = re.search(r'uddg=([^&]+)', clean_url)
            if uddg:
                final_url = urllib.parse.unquote(uddg.group(1))
            if final_url.startswith("//"):
                final_url = "https:" + final_url
            results.append({
                "title": clean_title,
                "snippet": clean_snippet,
                "url": final_url,
            })

    if not results:
        blocks2 = re.findall(
            r'class="[^"]*result[^"]*"[^>]*>.*?<a[^>]+href="(https?://[^"]*)"[^>]*>(.*?)</a>',
            html,
            re.DOTALL
        )
        for url, title in blocks2[:10]:
            clean_title = re.sub(r'<[^>]+>', '', title).strip()
            if clean_title and len(clean_title) > 3:
                results.append({
                    "title": clean_title,
                    "snippet": "",
                    "url": urllib.parse.unquote(url),
                })

    return results[:10]


def search_ddg(query: str) -> list:
    """Поиск через DuckDuckGo HTML"""
    encoded = urllib.parse.urlencode({"q": query, "kl": "ru-ru"})
    url = f"https://html.duckduckgo.com/html/?{encoded}"

    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    })

    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    return extract_results(html)


def handler(event: dict, context) -> dict:
    """Поиск в интернете через DuckDuckGo"""
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

    body = json.loads(event.get("body") or "{}")
    query = body.get("query", "").strip()

    if not query:
        return {
            "statusCode": 400,
            "headers": cors,
            "body": json.dumps({"error": "query обязателен"}),
        }

    try:
        results = search_ddg(query)
    except urllib.error.HTTPError as e:
        return {
            "statusCode": 502,
            "headers": cors,
            "body": json.dumps({"error": f"Ошибка поиска: HTTP {e.code}"}),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors,
            "body": json.dumps({"error": f"Ошибка поиска: {str(e)}"}),
        }

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({
            "query": query,
            "results": results,
            "total": len(results),
        }),
    }