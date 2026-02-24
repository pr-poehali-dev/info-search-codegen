import { useState } from "react";
import Icon from "@/components/ui/icon";

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}

const KEYWORDS: Record<string, string[]> = {
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "default", "async", "await", "new", "this", "try", "catch", "throw", "typeof", "instanceof", "in", "of", "switch", "case", "break", "continue", "do", "yield", "null", "undefined", "true", "false"],
  typescript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "default", "async", "await", "new", "this", "try", "catch", "throw", "typeof", "instanceof", "in", "of", "switch", "case", "break", "continue", "do", "yield", "null", "undefined", "true", "false", "interface", "type", "enum", "implements", "extends", "public", "private", "protected", "readonly", "as", "is", "keyof", "never", "void"],
  python: ["def", "class", "import", "from", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "raise", "pass", "break", "continue", "and", "or", "not", "in", "is", "None", "True", "False", "lambda", "yield", "global", "nonlocal", "del", "assert", "async", "await", "self"],
  rust: ["fn", "let", "mut", "const", "if", "else", "for", "while", "loop", "match", "return", "struct", "enum", "impl", "trait", "pub", "use", "mod", "crate", "self", "super", "where", "async", "await", "move", "ref", "type", "dyn", "static", "unsafe", "extern", "true", "false"],
  go: ["func", "var", "const", "if", "else", "for", "range", "return", "struct", "interface", "type", "package", "import", "defer", "go", "chan", "select", "case", "default", "switch", "break", "continue", "map", "make", "new", "nil", "true", "false"],
  html: ["html", "head", "body", "div", "span", "p", "a", "img", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "table", "tr", "td", "th", "form", "input", "button", "select", "option", "textarea", "label", "script", "style", "link", "meta", "title", "section", "article", "nav", "header", "footer", "main"],
  css: ["color", "background", "margin", "padding", "border", "display", "position", "width", "height", "font", "text", "flex", "grid", "align", "justify", "overflow", "opacity", "transform", "transition", "animation"],
};

function highlightLine(line: string, lang: string): JSX.Element[] {
  const keywords = KEYWORDS[lang] || KEYWORDS["javascript"] || [];
  const parts: JSX.Element[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    const strMatch = remaining.match(/^(["'`])(?:(?!\1|\\).|\\.)*\1/);
    if (strMatch) {
      parts.push(<span key={key++} className="text-amber-300">{strMatch[0]}</span>);
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    const commentMatch = remaining.match(/^(\/\/.*|#.*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/);
    if (commentMatch) {
      parts.push(<span key={key++} className="text-zinc-500 italic">{commentMatch[0]}</span>);
      remaining = remaining.slice(commentMatch[0].length);
      continue;
    }

    const numMatch = remaining.match(/^\b\d+(\.\d+)?\b/);
    if (numMatch) {
      parts.push(<span key={key++} className="text-purple-400">{numMatch[0]}</span>);
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    const wordMatch = remaining.match(/^\b[a-zA-Z_]\w*\b/);
    if (wordMatch) {
      const word = wordMatch[0];
      if (keywords.includes(word)) {
        parts.push(<span key={key++} className="text-blue-400 font-medium">{word}</span>);
      } else if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        parts.push(<span key={key++} className="text-cyan-400">{word}</span>);
      } else {
        parts.push(<span key={key++} className="text-zinc-200">{word}</span>);
      }
      remaining = remaining.slice(word.length);
      continue;
    }

    const tagMatch = remaining.match(/^[<>/=]/);
    if (tagMatch) {
      parts.push(<span key={key++} className="text-zinc-500">{tagMatch[0]}</span>);
      remaining = remaining.slice(1);
      continue;
    }

    const opMatch = remaining.match(/^[{}()[\];:.,+\-*/%&|^~!?@$\\]/);
    if (opMatch) {
      parts.push(<span key={key++} className="text-zinc-400">{opMatch[0]}</span>);
      remaining = remaining.slice(1);
      continue;
    }

    parts.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return parts;
}

const CodeBlock = ({ code, language, showLineNumbers = true }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");
  const lang = language.toLowerCase().replace(/^(js|jsx)$/, "javascript").replace(/^(ts|tsx)$/, "typescript").replace(/^(py)$/, "python").replace(/^(rs)$/, "rust");

  return (
    <div className="group relative rounded-xl border border-border bg-[hsl(230_15%_5%)] overflow-hidden animate-fade-in-scale">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-secondary/30">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider ml-1">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/50"
        >
          <Icon name={copied ? "Check" : "Copy"} size={12} />
          {copied ? "OK" : "Копировать"}
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <pre className="p-4 text-[13px] leading-relaxed font-mono">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex hover:bg-white/[0.02] -mx-4 px-4">
                {showLineNumbers && (
                  <span className="select-none text-zinc-600 w-8 text-right mr-4 flex-shrink-0 text-xs leading-relaxed">{i + 1}</span>
                )}
                <span>{highlightLine(line, lang)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
