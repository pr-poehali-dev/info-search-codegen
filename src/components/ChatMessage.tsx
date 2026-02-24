import CodeBlock from "@/components/CodeBlock";
import Icon from "@/components/ui/icon";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function parseContent(content: string): JSX.Element[] {
  const parts: JSX.Element[] = [];
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = codeRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      parts.push(
        <p key={key++} className="whitespace-pre-wrap leading-relaxed">
          {text}
        </p>
      );
    }
    parts.push(
      <div key={key++} className="my-3">
        <CodeBlock code={match[2].trim()} language={match[1] || "text"} />
      </div>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <p key={key++} className="whitespace-pre-wrap leading-relaxed">
        {content.slice(lastIndex)}
      </p>
    );
  }

  return parts;
}

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-primary/20" : "bg-secondary"
        }`}
      >
        <Icon
          name={isUser ? "User" : "Bot"}
          size={16}
          className={isUser ? "text-primary" : "text-muted-foreground"}
        />
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border rounded-tl-sm"
        }`}
      >
        {parseContent(message.content)}
        <span className="block text-[10px] mt-2 opacity-50">
          {message.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
