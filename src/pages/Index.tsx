import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChatMessage, { Message } from "@/components/ChatMessage";

const CHAT_URL = "https://functions.poehali.dev/0260dc2f-d377-4c7e-98ae-5cff0866c4a3";
const MODELS_URL = "https://functions.poehali.dev/53a4654a-c222-4575-948a-a460eebde721";

interface ModelInfo {
  id: string;
  name: string;
  context_length: number;
  prompt_price: number;
  description: string;
}

const QUICK_PROMPTS = [
  { label: "Python скрипт", icon: "FileCode", query: "Напиши пример сортировки пузырьком на Python с комментариями" },
  { label: "TypeScript API", icon: "Server", query: "Напиши REST API обработчик на TypeScript с типизацией" },
  { label: "Rust утилита", icon: "Cpu", query: "Напиши утилиту для чтения CSV файла на Rust" },
  { label: "Go сервер", icon: "Globe", query: "Напиши HTTP сервер с роутингом на Go" },
];

function formatCtx(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function formatPrice(price: number): string {
  if (price <= 0) return "Бесплатно";
  if (price < 0.000001) return `$${(price * 1_000_000).toFixed(2)}/M`;
  return `$${(price * 1_000_000).toFixed(3)}/M`;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [history, setHistory] = useState<{ query: string; date: Date }[]>([]);

  // Model & settings
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("anthropic/claude-3.5-haiku");
  const [contextLimit, setContextLimit] = useState(40);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [modelSearch, setModelSearch] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, autoScroll]);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await fetch(MODELS_URL);
      const data = await res.json();
      setModels(data.models || []);
    } catch {
      // ignore
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messagesRef.current, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);
    setHistory((prev) => [{ query: text.trim(), date: new Date() }, ...prev.slice(0, 49)]);

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
          max_tokens: maxTokens,
          context_limit: contextLimit,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Ошибка: ${err instanceof Error ? err.message : "не удалось получить ответ"}. Проверь API-ключ в настройках.`,
        timestamp: new Date(),
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

  const clearChat = () => setMessages([]);

  const selectedModelInfo = models.find((m) => m.id === selectedModel);
  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon name="Zap" size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Code Agent</h1>
            <p className="text-xs text-muted-foreground">
              {selectedModelInfo ? selectedModelInfo.name : selectedModel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedModelInfo && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
              ctx {formatCtx(selectedModelInfo.context_length)}
            </span>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={clearChat}>
            <Icon name="Trash2" size={18} />
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-6 mt-3 bg-secondary/50 self-start">
          <TabsTrigger value="chat" className="gap-1.5 text-xs">
            <Icon name="MessageSquare" size={14} />
            Чат
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

        {/* ── Chat Tab ── */}
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
                    Генерирую код на любом языке через{" "}
                    <span className="text-foreground font-medium">{selectedModelInfo?.name || selectedModel}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => sendMessage(p.query)}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-accent transition-all text-left group"
                      >
                        <Icon name={p.icon} size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => <ChatMessage key={msg.id} message={msg} showLineNumbers={showLineNumbers} />)
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
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Model quick-select */}
              <div className="flex items-center gap-2">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-7 text-xs bg-secondary/50 border-border rounded-lg flex-1 max-w-xs">
                    <SelectValue placeholder="Выбери модель" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {models.slice(0, 30).map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        <span className="truncate">{m.name}</span>
                        <span className="ml-2 text-muted-foreground">{formatCtx(m.context_length)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">
                  Shift+Enter — перенос строки
                </span>
              </div>

              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Опиши, какой код нужен..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-border bg-card px-5 py-4 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
                <Button
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-3 bottom-3 h-8 w-8 rounded-xl"
                >
                  <Icon name={isTyping ? "Loader" : "ArrowUp"} size={16} className={isTyping ? "animate-spin" : ""} />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── History Tab ── */}
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
                      onClick={() => { setActiveTab("chat"); sendMessage(item.query); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-accent transition-all text-left group"
                    >
                      <Icon name="MessageSquare" size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{item.query}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {item.date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Icon name="ArrowRight" size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="flex-1 flex flex-col min-h-0 mt-0">
          <ScrollArea className="flex-1 px-6">
            <div className="py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
              <h2 className="text-lg font-semibold">Настройки</h2>

              {/* Model selection */}
              <section className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Модель</h3>

                <div className="relative">
                  <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Поиск модели..."
                    className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                </div>

                {modelsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                    <Icon name="Loader" size={14} className="animate-spin" />
                    Загружаю список моделей...
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {filteredModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                          selectedModel === m.id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/30 hover:bg-accent"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.id}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] text-muted-foreground">{formatCtx(m.context_length)} ctx</span>
                          <span className={`text-[10px] ${m.prompt_price <= 0 ? "text-primary" : "text-muted-foreground"}`}>
                            {formatPrice(m.prompt_price)}
                          </span>
                        </div>
                        {selectedModel === m.id && (
                          <Icon name="Check" size={14} className="text-primary flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                    {filteredModels.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">Ничего не найдено</p>
                    )}
                  </div>
                )}

                <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={loadModels} disabled={modelsLoading}>
                  <Icon name="RefreshCw" size={12} className={modelsLoading ? "animate-spin" : ""} />
                  Обновить список
                </Button>
              </section>

              {/* Generation params */}
              <section className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Параметры генерации</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Окно контекста (сообщений)</span>
                      <span className="text-sm font-mono text-primary">{contextLimit}</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={100}
                      step={2}
                      value={contextLimit}
                      onChange={(e) => setContextLimit(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Сколько последних сообщений отправляется вместе с запросом
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Макс. токенов ответа</span>
                      <span className="text-sm font-mono text-primary">{maxTokens.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={512}
                      max={32768}
                      step={512}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Больше — длиннее ответы, меньше — быстрее и дешевле
                    </p>
                  </div>
                </div>
              </section>

              {/* Interface */}
              <section className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Интерфейс</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <Icon name="Hash" size={16} className="text-muted-foreground" />
                      <span className="text-sm">Номера строк в коде</span>
                    </div>
                    <Switch checked={showLineNumbers} onCheckedChange={setShowLineNumbers} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <Icon name="ArrowDown" size={16} className="text-muted-foreground" />
                      <span className="text-sm">Автопрокрутка</span>
                    </div>
                    <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
                  </div>
                </div>
              </section>

              {/* Info */}
              <section className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">О приложении</h3>
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Провайдер</span>
                    <span>OpenRouter</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Моделей доступно</span>
                    <span>{models.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Версия</span>
                    <span>2.0.0</span>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
