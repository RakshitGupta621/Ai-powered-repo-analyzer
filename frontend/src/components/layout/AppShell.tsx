import { ReactNode } from "react";
import Link from "next/link";
import { Cpu } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="flex items-center gap-2.5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center group-hover:bg-accent-cyan/20 transition-colors">
              <Cpu className="w-3.5 h-3.5 text-accent-cyan" />
            </div>
            <span className="font-display font-semibold text-text-primary text-sm tracking-wide">
              CodeLens
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {children}
      </main>

      <footer className="border-t border-border-subtle py-4 px-6">
        <p className="text-center text-text-muted text-xs font-mono">
          CodeLens · RAG + Ollama + Gemini
        </p>
      </footer>
    </div>
  );
}
