import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "CodeLens — AI Codebase Understanding",
  description: "Query any codebase using natural language. Powered by RAG + Gemini.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="noise">
      <body className="grid-bg min-h-screen">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#18181f",
              color: "#f0f0f8",
              border: "1px solid #ffffff18",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#00ffa3", secondary: "#0a0a0f" } },
            error:   { iconTheme: { primary: "#ff4444", secondary: "#0a0a0f" } },
          }}
        />
      </body>
    </html>
  );
}
