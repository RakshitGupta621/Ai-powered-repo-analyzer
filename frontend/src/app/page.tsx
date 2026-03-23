"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Search, GitBranch, ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-cyan/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-accent-violet/5 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center max-w-3xl relative z-10"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan text-xs font-mono mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse-slow" />
          RAG · Gemini · ChromaDB
        </motion.div>

        {/* Headline */}
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-6 tracking-tight">
          Understand any{" "}
          <span className="relative inline-block">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-accent-green to-accent-cyan bg-[length:200%] animate-shimmer">
              codebase
            </span>
          </span>
          <br />
          in seconds.
        </h1>

        <p className="text-text-secondary text-lg md:text-xl mb-12 max-w-xl mx-auto leading-relaxed">
          Upload a repo, ask questions in plain English. CodeLens finds the right code,
          explains it, and traces impact — powered by semantic search and Gemini AI.
        </p>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-accent-cyan text-bg-base font-semibold text-base hover:bg-accent-cyan/90 transition-colors glow-cyan"
        >
          Open Dashboard
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-16"
        >
          {[
            { icon: Search,    label: "Semantic Search" },
            { icon: Zap,       label: "Instant Answers" },
            { icon: GitBranch, label: "Impact Analysis" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-base bg-bg-surface text-text-secondary text-sm"
            >
              <Icon className="w-3.5 h-3.5 text-accent-cyan" />
              {label}
            </div>
          ))}
        </motion.div>
      </motion.div>
    </main>
  );
}
