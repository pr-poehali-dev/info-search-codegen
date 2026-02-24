import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import ChatMessage, { Message } from "@/components/ChatMessage";

const DEMO_RESPONSES: Record<string, string> = {
  python: `Вот пример сортировки пузырьком на Python:

\`\`\`python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

data = [64, 34, 25, 12, 22, 11, 90]
print(bubble_sort(data))
\`\`\`

Алгоритм проходит по массиву, сравнивая соседние элементы и меняя их местами.`,

  typescript: `Вот HTTP-сервер на TypeScript с типизацией:

\`\`\`typescript
interface Route {
  path: string;
  method: "GET" | "POST";
  handler: (req: Request) => Response;
}

const routes: Route[] = [
  {
    path: "/api/health",
    method: "GET",
    handler: () => new Response(JSON.stringify({ status: "ok" })),
  },
];

function matchRoute(url: string, method: string): Route | undefined {
  return routes.find((r) => r.path === url && r.method === method);
}
\`\`\`

Простой роутер с типами — можно расширить middleware.`,

  rust: `Пример чтения файла и подсчёта слов на Rust:

\`\`\`rust
use std::collections::HashMap;
use std::fs;

fn count_words(text: &str) -> HashMap<&str, usize> {
    let mut map = HashMap::new();
    for word in text.split_whitespace() {
        *map.entry(word).or_insert(0) += 1;
    }
    map
}

fn main() {
    let content = fs::read_to_string("input.txt").unwrap();
    let counts = count_words(&content);
    for (word, count) in &counts {
        println!("{}: {}", word, count);
    }
}
\`\`\`

HashMap идеально подходит для частотного анализа.`,

  go: `HTTP API на Go с маршрутизацией:

\`\`\`go
package main

import (
    "encoding/json"
    "net/http"
)

type Response struct {
    Message string \`json:"message"\`
    Status  int    \`json:"status"\`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(Response{
        Message: "Server is running",
        Status:  200,
    })
}

func main() {
    http.HandleFunc("/health", healthHandler)
    http.ListenAndServe(":8080", nil)
}
\`\`\`

Стандартная библиотека Go отлично подходит для API.`,
};

const QUICK_PROMPTS = [
  { label: "Python скрипт", icon: "FileCode", query: "Напиши пример на Python" },
  { label: "TypeScript API", icon: "Server", query: "Напиши пример на TypeScript" },
  { label: "Rust утилита", icon: "Cpu", query: "Напиши пример на Rust" },
  { label: "Go сервер", icon: "Globe", query: "Напиши пример на Go" },
];

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [history, setHistory] = useState<{ query: string; date: Date }[]>([]);
  const [settings, setSettings] = useState({
    codeStyle: "dark",
    autoScroll: true,
    showLineNumbers: true,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (settings.autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, settings.autoScroll]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setHistory((prev) => [{ query: text.trim(), date: new Date() }, ...prev]);

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

    const lower = text.toLowerCase();
    let response = "";
    if (lower.includes("python") || lower.includes("питон")) {
      response = DEMO_RESPONSES.python;
    } else if (lower.includes("typescript") || lower.includes("ts") || lower.includes("тайпскрипт")) {
      response = DEMO_RESPONSES.typescript;
    } else if (lower.includes("rust") || lower.includes("раст")) {
      response = DEMO_RESPONSES.rust;
    } else if (lower.includes("go ") || lower.includes("golang") || lower.includes("го ")) {
      response = DEMO_RESPONSES.go;
    } else {
      response = `Вот универсальный пример на JavaScript:

\`\`\`javascript
async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(\`HTTP error: \${response.status}\`);
  }
  const data = await response.json();
  return data;
}

fetchData("https://api.example.com/data")
  .then((result) => console.log(result))
  .catch((err) => console.error(err));
\`\`\`

Могу переписать на любой язык — просто укажи какой.`;
    }

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-glow">
            <Icon name="Zap" size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Agent</h1>
            <p className="text-xs text-muted-foreground">Генерация кода на любом языке</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={clearChat}
          >
            <Icon name="Trash2" size={18} />
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-6 mt-3 bg-secondary/50 self-start">
          <TabsTrigger value="chat" className="gap-1.5 text-xs">
            <Icon name="MessageSquare" size={14} />
            Чат
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5 text-xs">
            <Icon name="Image" size={14} />
            Изображения
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <Icon name="Clock" size={14} />
            История
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <Icon name="Settings" size={14} />
            Настройки
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
          <ScrollArea className="flex-1 px-6" ref={scrollRef}>
            <div className="py-6 space-y-6 max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <Icon name="Code2" size={32} className="text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Что напишем?</h2>
                  <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
                    Генерирую код на Python, TypeScript, Rust, Go и других языках с подсветкой синтаксиса
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => sendMessage(p.query)}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-accent transition-all text-left group"
                      >
                        <Icon
                          name={p.icon}
                          size={16}
                          className="text-muted-foreground group-hover:text-primary transition-colors"
                        />
                        <span className="text-sm">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
              )}

              {isTyping && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icon name="Bot" size={16} className="text-muted-foreground" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-6 pb-6 pt-3">
            <div className="max-w-3xl mx-auto relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Опиши, какой код нужен..."
                rows={1}
                className="w-full resize-none rounded-2xl border border-border bg-card px-5 py-4 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="absolute right-3 bottom-3 h-8 w-8 rounded-xl"
              >
                <Icon name="ArrowUp" size={16} />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="flex flex-col items-center justify-center flex-1 animate-fade-in px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Icon name="ImagePlus" size={32} className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Генерация изображений</h2>
            <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
              Создавайте изображения по текстовому описанию — иконки, баннеры, иллюстрации
            </p>
            <div className="w-full max-w-md space-y-4">
              <textarea
                placeholder="Опишите изображение, которое хотите создать..."
                rows={3}
                className="w-full resize-none rounded-2xl border border-border bg-card px-5 py-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <Button className="w-full rounded-xl gap-2">
                <Icon name="Sparkles" size={16} />
                Сгенерировать
              </Button>
              <div className="grid grid-cols-2 gap-3">
                {["Минималистичный логотип", "Абстрактный фон", "Иконка приложения", "3D иллюстрация"].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      className="px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 flex flex-col min-h-0 mt-0">
          <ScrollArea className="flex-1 px-6">
            <div className="py-6 max-w-3xl mx-auto">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
                    <Icon name="Clock" size={32} className="text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Пока пусто</h2>
                  <p className="text-sm text-muted-foreground">История запросов появится здесь</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveTab("chat");
                        sendMessage(item.query);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-accent transition-all text-left group"
                    >
                      <Icon name="MessageSquare" size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{item.query}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {item.date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Icon
                        name="ArrowRight"
                        size={14}
                        className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 flex flex-col min-h-0 mt-0">
          <ScrollArea className="flex-1 px-6">
            <div className="py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold mb-4">Настройки агента</h2>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Код
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <Icon name="Hash" size={16} className="text-muted-foreground" />
                      <span className="text-sm">Номера строк</span>
                    </div>
                    <Switch
                      checked={settings.showLineNumbers}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, showLineNumbers: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <Icon name="ArrowDown" size={16} className="text-muted-foreground" />
                      <span className="text-sm">Автопрокрутка</span>
                    </div>
                    <Switch
                      checked={settings.autoScroll}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, autoScroll: v }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Тема
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSettings((s) => ({ ...s, codeStyle: "dark" }))}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      settings.codeStyle === "dark"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="w-full h-12 rounded-lg bg-[hsl(0_0%_5%)] mb-3 flex items-center justify-center">
                      <div className="flex gap-1">
                        <span className="w-6 h-1.5 rounded bg-emerald-400/60" />
                        <span className="w-8 h-1.5 rounded bg-sky-400/60" />
                        <span className="w-4 h-1.5 rounded bg-amber-300/60" />
                      </div>
                    </div>
                    <span className="text-sm font-medium">Тёмная</span>
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, codeStyle: "light" }))}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      settings.codeStyle === "light"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="w-full h-12 rounded-lg bg-zinc-200 mb-3 flex items-center justify-center">
                      <div className="flex gap-1">
                        <span className="w-6 h-1.5 rounded bg-emerald-600/60" />
                        <span className="w-8 h-1.5 rounded bg-sky-600/60" />
                        <span className="w-4 h-1.5 rounded bg-amber-600/60" />
                      </div>
                    </div>
                    <span className="text-sm font-medium">Светлая</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  О проекте
                </h3>
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Версия</span>
                    <span>1.0.0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Языки</span>
                    <span>Python, TS, Rust, Go, JS</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Модель</span>
                    <span>Демо-режим</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
