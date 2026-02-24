import CodeBlock from "@/components/CodeBlock";
import Icon from "@/components/ui/icon";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mode?: "chat" | "search" | "code" | "analyze";
  searchResults?: { title: string; snippet: string; url: string }[];
}

function renderInlineMarkdown(text: string): JSX.Element[] {
  const parts: JSX.Element[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++} className="font-semibold text-foreground">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const italicMatch = remaining.match(/^\*(.+?)\*/);
    if (italicMatch) {
      parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded-md bg-secondary text-primary text-[13px] font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    let nextSpecial = remaining.length;
    for (const marker of ["**", "*", "`", "["]) {
      const idx = remaining.indexOf(marker, 1);
      if (idx > 0 && idx < nextSpecial) nextSpecial = idx;
    }

    parts.push(<span key={key++}>{remaining.slice(0, nextSpecial)}</span>);
    remaining = remaining.slice(nextSpecial);
  }

  return parts;
}

function parseContent(content: string, showLineNumbers: boolean): JSX.Element[] {
  const parts: JSX.Element[] = [];
  const lines = content.split("\n");
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const codeFenceMatch = lines[i].match(/^```(\w*)/);
    if (codeFenceMatch) {
      const lang = codeFenceMatch[1] || "text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      parts.push(
        <div key={key++} className="my-3">
          <CodeBlock code={codeLines.join("\n")} language={lang} showLineNumbers={showLineNumbers} />
        </div>
      );
      continue;
    }

    if (lines[i].match(/^#{1,3}\s/)) {
      const level = lines[i].match(/^(#+)/)?.[1].length || 1;
      const text = lines[i].replace(/^#+\s/, "");
      const className = level === 1 ? "text-lg font-bold mt-4 mb-2" : level === 2 ? "text-base font-semibold mt-3 mb-1.5" : "text-sm font-semibold mt-2 mb-1";
      parts.push(
        <p key={key++} className={className}>{renderInlineMarkdown(text)}</p>
      );
      i++;
      continue;
    }

    if (lines[i].match(/^[-*]\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        listItems.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      parts.push(
        <ul key={key++} className="space-y-1.5 my-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-primary mt-1.5 flex-shrink-0">
                <Icon name="ChevronRight" size={12} />
              </span>
              <span>{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (lines[i].match(/^\d+\.\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      parts.push(
        <ol key={key++} className="space-y-1.5 my-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="text-primary font-mono text-xs mt-0.5 flex-shrink-0 w-5 text-right">{idx + 1}.</span>
              <span>{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (lines[i].trim() === "") {
      parts.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    parts.push(
      <p key={key++} className="text-sm leading-relaxed">
        {renderInlineMarkdown(lines[i])}
      </p>
    );
    i++;
  }

  return parts;
}

const modeConfig = {
  chat: { icon: "MessageCircle", color: "text-blue-400" },
  search: { icon: "Globe", color: "text-emerald-400" },
  code: { icon: "Code2", color: "text-amber-400" },
  analyze: { icon: "Sparkles", color: "text-purple-400" },
};

const ChatMessage = ({ message, showLineNumbers = true }: { message: Message; showLineNumbers?: boolean }) => {
  const isUser = message.role === "user";
  const mode = message.mode || "chat";
  const config = modeConfig[mode];

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
          isUser
            ? "bg-gradient-to-br from-primary/30 to-accent/30"
            : "bg-gradient-to-br from-primary/20 to-accent/20"
        }`}
      >
        <Icon
          name={isUser ? "User" : "Zap"}
          size={14}
          className={isUser ? "text-primary" : "text-primary"}
        />
      </div>

      <div className={`min-w-0 max-w-[85%] sm:max-w-[80%] ${isUser ? "text-right" : ""}`}>
        {!isUser && message.mode && message.mode !== "chat" && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Icon name={config.icon} size={12} className={config.color} />
            <span className={`text-[10px] font-medium ${config.color}`}>
              {mode === "search" ? "Поиск" : mode === "code" ? "Код" : "Анализ"}
            </span>
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-tr-md"
              : "glass-card rounded-tl-md"
          }`}
        >
          <div className="space-y-1">
            {parseContent(message.content, showLineNumbers)}
          </div>
        </div>

        {!isUser && message.searchResults && message.searchResults.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
              <Icon name="ExternalLink" size={10} />
              Источники
            </p>
            {message.searchResults.slice(0, 5).map((r, idx) => (
              <a
                key={idx}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-all group"
              >
                <span className="text-[10px] text-primary font-mono mt-0.5 flex-shrink-0">[{idx + 1}]</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.url}</p>
                </div>
              </a>
            ))}
          </div>
        )}

        <span className={`block text-[10px] mt-1.5 text-muted-foreground ${isUser ? "text-right" : ""}`}>
          {message.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
