"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Copy, Check } from "lucide-react";

// Sanitize user markdown before rendering KaTeX/highlight output
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
  },
};

const codeAttributes = Array.isArray(defaultSchema.attributes?.code)
  ? [...defaultSchema.attributes.code]
  : [];
const codeClassIndex = codeAttributes.findIndex(
  (entry) => Array.isArray(entry) && entry[0] === "className"
);

if (codeClassIndex >= 0) {
  const current = codeAttributes[codeClassIndex];
  codeAttributes[codeClassIndex] = [
    "className",
    ...current.slice(1),
    "math-inline",
    "math-display",
  ];
} else {
  codeAttributes.push(["className", "math-inline", "math-display"]);
}

sanitizeSchema.attributes.code = codeAttributes;

export default function Markdown({
  children,
  className = "",
  enableHighlight = true,
  enableMath = false,
}) {
  const [actualHighlight, setActualHighlight] = useState(enableHighlight);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setActualHighlight(enableHighlight),
      enableHighlight ? 50 : 0
    );
    return () => window.clearTimeout(timer);
  }, [enableHighlight]);

  const remarkPlugins = enableMath ? [remarkMath, remarkGfm] : [remarkGfm];
  const rehypePlugins = [[rehypeSanitize, sanitizeSchema]];

  if (enableMath) {
    rehypePlugins.push([rehypeKatex, { strict: "ignore" }]);
  }

  if (actualHighlight) {
    rehypePlugins.push(rehypeHighlight);
  }

  return (
    <div
      className={`ai-markdown prose ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          table: ({ children, ...props }) => (
            <div className="table-scroll-wrapper">
              <table {...props}>{children}</table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th {...props}>
              <div className="table-cell-inner">{children}</div>
            </th>
          ),
          td: ({ children, ...props }) => (
            <td {...props}>
              <div className="table-cell-inner">{children}</div>
            </td>
          ),
          code: ({ className, children, inline, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";
            
            if (inline) {
              return <code className="rounded bg-[var(--oa-paper-soft)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--oa-ink)]" {...props}>{children}</code>;
            }

            return (
              <div className="group/code relative my-4 overflow-hidden rounded-lg border border-[var(--oa-card-border)]">
                <div className="flex items-center justify-between border-b border-[var(--oa-card-head-border)] bg-[var(--oa-paper-soft)] px-4 py-2 text-[11px] font-medium uppercase tracking-widest text-[var(--oa-muted)]">
                  <span>{lang || "code"}</span>
                  <CodeCopyButton text={String(children).replace(/\n$/, "")} />
                </div>
                <pre className="!m-0 !rounded-none overflow-x-auto bg-[var(--ai-code-bg)] p-4 text-[#fafafa]">
                  <code className={`${className} !bg-transparent text-[13.5px] leading-relaxed`} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function CodeCopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 hover:text-primary transition-colors"
    >
      {copied ? (
        <>
          <Check size={12} />
          <span>COPIED</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>COPY</span>
        </>
      )}
    </button>
  );
}
