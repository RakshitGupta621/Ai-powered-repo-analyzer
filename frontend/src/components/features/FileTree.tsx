"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, FolderOpen, FileCode, ChevronRight } from "lucide-react";
import type { FileNode } from "@/types";

interface Props {
  fileTree: FileNode[];
}

export default function FileTree({ fileTree }: Props) {
  if (!fileTree || fileTree.length === 0) {
    return (
      <p className="text-text-muted text-sm py-8 text-center">
        No file tree available yet.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4 max-w-xl">
      <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-3 px-1">
        File Structure
      </p>
      <div className="space-y-0.5">
        {fileTree.map((node) => (
          <TreeNode key={node.name} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === "dir";

  return (
    <div>
      <button
        onClick={() => isDir && setOpen((o) => !o)}
        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left transition-colors
          ${isDir ? "hover:bg-white/5 cursor-pointer" : "cursor-default"}
          text-text-secondary hover:text-text-primary text-xs
        `}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {isDir ? (
          <>
            <ChevronRight
              className={`w-3 h-3 text-text-muted flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
            />
            {open
              ? <FolderOpen className="w-3.5 h-3.5 text-accent-amber flex-shrink-0" />
              : <Folder className="w-3.5 h-3.5 text-accent-amber/70 flex-shrink-0" />
            }
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <FileCode className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          </>
        )}
        <span className="truncate font-mono">{node.name}</span>
      </button>

      <AnimatePresence initial={false}>
        {isDir && open && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeNode key={child.name} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
