"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconColor?: "cyan" | "red" | "amber";
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}

const iconColors = {
  cyan:  "bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan",
  red:   "bg-red-500/10 border-red-500/30 text-red-400",
  amber: "bg-amber-500/10 border-amber-500/30 text-amber-400",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  iconColor = "cyan",
  children,
  maxWidth = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Auto-focus first focusable element
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([aria-label="Close modal"]), input, textarea, select'
        );
        focusable?.[0]?.focus();
      }, 100);
    }
  }, [open]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40"
          />

          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <motion.div
              key="modal"
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              className={`relative w-full ${widths[maxWidth]} bg-bg-surface border border-border-base rounded-2xl shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between p-6 pb-4">
                <div className="flex items-center gap-3">
                  {icon && (
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${iconColors[iconColor]}`}>
                      {icon}
                    </div>
                  )}
                  <div>
                    <h2
                      id="modal-title"
                      className="font-display font-semibold text-text-primary text-base"
                    >
                      {title}
                    </h2>
                    {description && (
                      <p className="text-text-muted text-sm mt-0.5">{description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors flex-shrink-0 ml-4 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 pb-6">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
