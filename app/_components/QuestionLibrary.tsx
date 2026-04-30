"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { Card, Pill } from "./ui";
import { QUESTION_LIBRARY } from "@/lib/data/question-library";

/**
 * Browseable / addable question library. Each row has a + that appends
 * the prompt to the host's current question list (via onAdd). Already-added
 * prompts are dimmed and show a checkmark instead of a plus.
 */
export function QuestionLibrary({
  currentPrompts,
  onAdd,
  className,
}: {
  currentPrompts: string[];
  onAdd: (prompt: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(QUESTION_LIBRARY.map((c) => c.name)),
  );
  const used = useMemo(
    () => new Set(currentPrompts.map((p) => p.trim().toLowerCase())),
    [currentPrompts],
  );

  function toggleCategory(name: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const totalCount = QUESTION_LIBRARY.reduce(
    (n, c) => n + c.questions.length,
    0,
  );

  return (
    <Card className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
        type="button"
      >
        <div>
          <h2 className="font-display text-xl font-bold">Question library</h2>
          <p className="text-ink-soft text-xs">
            Browse {totalCount} prompts and tap + to add to your game.
          </p>
        </div>
        <span className="text-ink-soft text-xl shrink-0">
          {open ? "▾" : "▸"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {QUESTION_LIBRARY.map((cat) => {
                const expanded = openCategories.has(cat.name);
                return (
                  <div key={cat.name}>
                    <button
                      onClick={() => toggleCategory(cat.name)}
                      className="w-full flex items-center justify-between mb-2"
                      type="button"
                    >
                      <h3 className="font-display text-base font-bold">
                        {cat.name}
                      </h3>
                      <Pill tone="lavender">{cat.questions.length}</Pill>
                    </button>
                    {expanded && (
                      <ul className="space-y-1.5">
                        {cat.questions.map((q) => {
                          const isUsed = used.has(q.trim().toLowerCase());
                          return (
                            <li key={q}>
                              <button
                                onClick={() => onAdd(q)}
                                disabled={isUsed}
                                className={`w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-pill transition ${
                                  isUsed
                                    ? "bg-mint/30 text-emerald-900 cursor-default"
                                    : "bg-cream-deep/30 hover:bg-blush/30 text-ink"
                                }`}
                                type="button"
                              >
                                <span className="flex-1 truncate">{q}</span>
                                {isUsed ? (
                                  <Check size={14} className="shrink-0" />
                                ) : (
                                  <Plus size={14} className="shrink-0" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
