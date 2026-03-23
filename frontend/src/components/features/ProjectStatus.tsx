import type { ProjectStatus as Status } from "@/types";

interface Props {
  status: Status;
  compact?: boolean;
}

const CONFIG: Record<Status, { label: string; dot: string; text: string; bg: string }> = {
  pending:   { label: "Pending",   dot: "bg-text-muted",   text: "text-text-muted",    bg: "bg-white/5" },
  ingesting: { label: "Ingesting", dot: "bg-accent-amber animate-pulse", text: "text-accent-amber", bg: "bg-accent-amber/10" },
  ready:     { label: "Ready",     dot: "bg-accent-green", text: "text-accent-green",  bg: "bg-accent-green/10" },
  failed:    { label: "Failed",    dot: "bg-red-400",      text: "text-red-400",       bg: "bg-red-400/10" },
};

export default function ProjectStatus({ status, compact = false }: Props) {
  const c = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-transparent
        ${c.bg} ${c.text}
        ${compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}
