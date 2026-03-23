"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Send, Loader2, Sparkles, ChevronDown, ChevronUp, Copy, Check, Clock } from "lucide-react";
import { useQuery } from "@/hooks/useIngestion";
import type { QueryResult, RetrievedChunk } from "@/types";

const SUGGESTIONS = [
  "Where is authentication handled?",
  "Explain the data flow for payments",
  "What are the main API endpoints?",
  "How is error handling implemented?",
  "Which files would break if I changed the database schema?",
];

export default function QueryPanel({ projectId }: { projectId: string }) {
  const [question, setQuestion] = useState("");
  const { ask, loading, history } = useQuery(projectId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSubmit = async (q?: string) => {
    const text = (q || question).trim();
    if (!text || loading) return;
    setQuestion("");
    await ask(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Suggestions (only when no history) */}
      {history.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-accent-cyan" />
            Suggested queries
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSubmit(s)}
                className="px-3 py-1.5 rounded-full border border-border-base bg-bg-surface text-text-secondary text-xs hover:border-accent-cyan/40 hover:text-text-primary hover:bg-accent-cyan/5 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* History */}
      <div className="space-y-6">
        <AnimatePresence initial={false}>
          {[...history].reverse().map(({ question: q, result }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Question bubble */}
              <div className="flex justify-end">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm bg-accent-cyan/10 border border-accent-cyan/20">
                  <p className="text-text-primary text-sm">{q}</p>
                </div>
              </div>

              {/* Answer */}
              <AnswerCard result={result} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Loading indicator */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border-subtle bg-bg-surface w-fit"
        >
          <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
          <span className="text-text-muted text-sm">Searching codebase…</span>
        </motion.div>
      )}

      <div ref={bottomRef} />

      {/* Input */}
      <div className="sticky bottom-6">
        <div className="relative rounded-2xl border border-border-base bg-bg-surface focus-within:border-accent-cyan/40 focus-within:ring-1 focus-within:ring-accent-cyan/10 transition-all shadow-xl">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your codebase…"
            rows={1}
            className="w-full px-5 py-4 pr-14 bg-transparent text-text-primary placeholder:text-text-muted text-sm resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: "52px", maxHeight: "200px" }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!question.trim() || loading}
            className="absolute right-3 bottom-3 p-2 rounded-xl bg-accent-cyan disabled:bg-bg-overlay disabled:text-text-muted text-bg-base hover:bg-accent-cyan/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-text-muted text-xs mt-2">
          ↵ Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ── Answer card ───────────────────────────────────────────────────────────────

function AnswerCard({ result }: { result: QueryResult }) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAnswer = () => {
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface overflow-hidden">
      {/* Answer header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-accent-cyan/10 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-accent-cyan" />
          </div>
          <span className="text-text-secondary text-xs font-medium">Answer</span>
          {result.cached && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-text-muted text-xs">
              <Clock className="w-2.5 h-2.5" />
              cached
            </span>
          )}
        </div>
        <button
          onClick={copyAnswer}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Markdown answer */}
      <div className="px-5 py-4 prose-answer">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    borderRadius: "12px",
                    border: "1px solid #ffffff18",
                    fontSize: "12.5px",
                    margin: "0.75rem 0",
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>{children}</code>
              );
            },
          }}
        >
          {result.answer}
        </ReactMarkdown>
      </div>

      {/* Sources toggle */}
      {result.retrieved_chunks?.length > 0 && (
        <div className="border-t border-border-subtle">
          <button
            onClick={() => setShowSources((s) => !s)}
            className="w-full flex items-center justify-between px-5 py-3 text-text-muted hover:text-text-secondary text-xs transition-colors"
          >
            <span>{result.retrieved_chunks.length} source{result.retrieved_chunks.length !== 1 ? "s" : ""} referenced</span>
            {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {showSources && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 space-y-3">
                  {result.retrieved_chunks.map((chunk) => (
                    <ChunkCard key={chunk.chunk_id} chunk={chunk} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ChunkCard({ chunk }: { chunk: RetrievedChunk }) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = chunk.score > 0.8 ? "text-accent-green" : chunk.score > 0.6 ? "text-accent-amber" : "text-text-muted";

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-overlay overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-accent-cyan/80 text-xs truncate">{chunk.file_path}</span>
          {chunk.start_line && (
            <span className="text-text-muted text-xs flex-shrink-0">
              :{chunk.start_line}–{chunk.end_line}
            </span>
          )}
        </div>
        <span className={`font-mono text-xs flex-shrink-0 ml-3 ${scoreColor}`}>
          {(chunk.score * 100).toFixed(0)}%
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <SyntaxHighlighter
              style={oneDark as any}
              language={chunk.language || "plaintext"}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: "11.5px",
                border: "none",
                borderTop: "1px solid #ffffff0d",
              }}
            >
              {chunk.content}
            </SyntaxHighlighter>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
