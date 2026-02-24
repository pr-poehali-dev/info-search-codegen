import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import ChatMessage, { Message } from "@/components/ChatMessage";

const CHAT_URL = "https://functions.poehali.dev/0260dc2f-d377-4c7e-98ae-5cff0866c4a3";
const MODELS_URL = "https://functions.poehali.dev/53a4654a-c222-4575-948a-a460eebde721";
const SEARCH_URL = "https://functions.poehali.dev/c5a74994-b585-4873-a547-61de2ca17ba3";

interface ModelInfo {
  id: string;
  name: string;
  context_length: number;
  prompt_price: number;
  description: string;
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

type ToolMode = "chat" | "search" | "code" | "analyze";

const TOOL_MODES: { id: ToolMode; label: string; icon: string; placeholder: string; description: string }[] = [
  { id: "chat", label: "Чат", icon: "MessageCircle", placeholder: "Спроси что угодно...", description: "Общение с ИИ" },
  { id: "search", label: "Поиск", icon: "Globe", placeholder: "Что найти в интернете?", description: "Поиск в интернете" },
  { id: "code", label: "Код", icon: "Code2", placeholder: "Опиши, какой код нужен...", description: "Генерация кода" },
  { id: "analyze", label: "Анализ", icon: "Sparkles", placeholder: "Что нужно проанализировать?", description: "Анализ информации" },
];

const QUICK_ACTIONS = [
  { label: "Найди в интернете", icon: "Search", query: "Найди последние новости о", mode: "search" as ToolMode },
  { label: "Напиши код", icon: "FileCode", query: "Напиши функцию на Python для", mode: "code" as ToolMode },
  { label: "Проанализируй", icon: "BarChart3", query: "Проанализируй ", mode: "analyze" as ToolMode },
  { label: "Объясни тему", icon: "BookOpen", query: "Объясни простыми словами ", mode: "chat" as ToolMode },
];

function formatCtx(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function formatPrice(price: number): string {
  if (price <= 0) return "Free";
  return `$${(price * 1_000_000).toFixed(2)}/M`;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-001");
  const [contextLimit, setContextLimit] = useState(40);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [modelSearch, setModelSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, isTyping, autoScroll]);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await fetch(MODELS_URL);
      const data = await res.json();
      setModels(data.models || []);
    } catch {
      console.error("Failed to load models");
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const doWebSearch = async (query: string): Promise<SearchResult[]> => {
    try {
      const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      return data.results || [];
    } catch {
      return [];
    }
  };

  const sendMessage = async (text: string, mode?: ToolMode) => {
    if (!text.trim() || isTyping) return;

    const activeMode = mode || toolMode;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
      mode: activeMode,
    };

    const updatedMessages = [...messagesRef.current, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      let finalContent = text.trim();
      let searchResults: SearchResult[] = [];

      if (activeMode === "search") {
        searchResults = await doWebSearch(text.trim());
        if (searchResults.length > 0) {
          const searchContext = searchResults
            .map((r, i) => `[${i + 1}] "${r.title}" — ${r.snippet} (${r.url})`)
            .join("\n");
          finalContent = `Пользователь попросил найти: "${text.trim()}"

Результаты веб-поиска:
${searchContext}

Пожалуйста, проанализируй эти результаты и дай полный ответ на запрос пользователя. Укажи источники.`;
        }
      } else if (activeMode === "code") {
        finalContent = `Напиши код: ${text.trim()}

Используй правильное форматирование с блоками кода. Код должен быть production-ready.`;
      } else if (activeMode === "analyze") {
        finalContent = `Проведи глубокий анализ: ${text.trim()}

Структурируй ответ с заголовками, пунктами и выводами.`;
      }

      const chatMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.role === "user" && m.id === userMsg.id ? finalContent : m.content,
      }));

      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          model: selectedModel,
          max_tokens: maxTokens,
          context_limit: contextLimit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        mode: activeMode,
        searchResults: searchResults.length > 0 ? searchResults : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Ошибка: ${err instanceof Error ? err.message : "не удалось получить ответ"}`,
        timestamp: new Date(),
        mode: activeMode,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
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

  const selectedModelInfo = models.find((m) => m.id === selectedModel);
  const currentMode = TOOL_MODES.find((m) => m.id === toolMode)!;
  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <div className="h-[100dvh] flex bg-background overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:relative z-40 h-full w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Icon name="Zap" size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight gradient-text">Nexus AI</h1>
              <p className="text-[11px] text-muted-foreground">Умный ассистент</p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-1">
          <button
            onClick={() => { clearChat(); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm hover:bg-secondary transition-colors text-left"
          >
            <Icon name="Plus" size={16} className="text-primary" />
            <span>Новый диалог</span>
          </button>
        </div>

        <div className="px-3 py-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest px-4 mb-2">Инструменты</p>
          <div className="space-y-0.5">
            {TOOL_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setToolMode(m.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                  toolMode === m.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon name={m.icon} size={16} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-3 border-t border-border">
          <button
            onClick={() => { setShowSettings(!showSettings); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            <Icon name="Settings" size={16} />
            <span>Настройки</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors">
              <Icon name="Menu" size={20} className="text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <Icon name={currentMode.icon} size={18} className="text-primary" />
              <span className="font-semibold text-sm">{currentMode.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedModelInfo && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg">
                <Icon name="Cpu" size={12} />
                <span className="truncate max-w-[140px]">{selectedModelInfo.name}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={clearChat}
            >
              <Icon name="Trash2" size={16} />
            </Button>
          </div>
        </header>

        {showSettings ? (
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 max-w-xl mx-auto w-full space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Настройки</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(false)}>
                  <Icon name="X" size={16} />
                </Button>
              </div>

              <section className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Модель ИИ</h3>
                <div className="relative">
                  <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Поиск модели..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                {modelsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                    <Icon name="Loader" size={14} className="animate-spin" />
                    Загружаю модели...
                  </div>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin rounded-xl">
                    {filteredModels.slice(0, 50).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                          selectedModel === m.id
                            ? "border-primary/50 bg-primary/5 glow-blue"
                            : "border-border bg-card hover:border-primary/20 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatCtx(m.context_length)} ctx · {formatPrice(m.prompt_price)}
                          </p>
                        </div>
                        {selectedModel === m.id && (
                          <Icon name="Check" size={16} className="text-primary mt-0.5 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={loadModels} disabled={modelsLoading}>
                  <Icon name="RefreshCw" size={12} className={modelsLoading ? "animate-spin" : ""} />
                  Обновить
                </Button>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Генерация</h3>
                <div className="glass-card rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Контекст (сообщений)</span>
                    <span className="text-sm font-mono text-primary">{contextLimit}</span>
                  </div>
                  <input type="range" min={4} max={100} step={2} value={contextLimit} onChange={(e) => setContextLimit(Number(e.target.value))} className="w-full accent-primary" />
                </div>
                <div className="glass-card rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Макс. токенов</span>
                    <span className="text-sm font-mono text-primary">{maxTokens.toLocaleString()}</span>
                  </div>
                  <input type="range" min={512} max={32768} step={512} value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} className="w-full accent-primary" />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Интерфейс</h3>
                <div className="glass-card rounded-xl divide-y divide-border">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Icon name="Hash" size={16} className="text-muted-foreground" />
                      <span className="text-sm">Номера строк</span>
                    </div>
                    <Switch checked={showLineNumbers} onCheckedChange={setShowLineNumbers} />
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Icon name="ArrowDown" size={16} className="text-muted-foreground" />
                      <span className="text-sm">Автопрокрутка</span>
                    </div>
                    <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">О проекте</h3>
                <div className="glass-card rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Название</span>
                    <span className="font-medium gradient-text">Nexus AI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Провайдер</span>
                    <span>OpenRouter</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Моделей</span>
                    <span>{models.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Версия</span>
                    <span>3.0.0</span>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        ) : (
          <>
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto w-full">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 glow-blue">
                      <Icon name="Zap" size={36} className="text-primary" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">Nexus AI</h2>
                    <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
                      Чат, поиск в интернете, генерация кода и анализ — всё в одном месте
                    </p>

                    <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                      {QUICK_ACTIONS.map((a) => (
                        <button
                          key={a.label}
                          onClick={() => {
                            setToolMode(a.mode);
                            setInput(a.query);
                            inputRef.current?.focus();
                          }}
                          className="flex items-center gap-3 px-4 py-3.5 rounded-xl glass-card hover:border-primary/30 transition-all text-left group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                            <Icon name={a.icon} size={16} className="text-primary" />
                          </div>
                          <span className="text-sm">{a.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} showLineNumbers={showLineNumbers} />
                  ))
                )}

                {isTyping && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      <Icon name="Zap" size={14} className="text-primary" />
                    </div>
                    <div className="glass-card rounded-2xl rounded-tl-md px-5 py-3.5">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-primary rounded-full animate-typing-dot" />
                        <span className="w-2 h-2 bg-primary rounded-full animate-typing-dot [animation-delay:200ms]" />
                        <span className="w-2 h-2 bg-primary rounded-full animate-typing-dot [animation-delay:400ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
              <div className="max-w-3xl mx-auto space-y-2">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
                  {TOOL_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setToolMode(m.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        toolMode === m.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <Icon name={m.icon} size={13} />
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentMode.placeholder}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-border bg-card px-5 py-4 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isTyping}
                    className="absolute right-3 bottom-3 h-9 w-9 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  >
                    <Icon name={isTyping ? "Loader" : "ArrowUp"} size={16} className={`text-white ${isTyping ? "animate-spin" : ""}`} />
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                  Shift+Enter — перенос строки · {selectedModelInfo?.name || selectedModel}
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
