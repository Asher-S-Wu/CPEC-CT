"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CHAT_MODELS,
  getGroupedSelectableModels,
  MODEL_GROUP_TITLES,
} from "@/lib/ai/shared/models";
import { ModelGlyph } from "./ModelVisuals";

export default function ModelSelector({
  model,
  onModelChange,
  ready = true,
  fullWidth = false,
}) {
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const mounted = typeof window !== "undefined";
  const currentModel = ready ? CHAT_MODELS.find((item) => item.id === model) : null;
  const currentModelLabel = currentModel?.name || "模型";
  const groupedModels = getGroupedSelectableModels();

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportOffsetTop = window.visualViewport?.offsetTop || 0;
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const viewportOffsetLeft = window.visualViewport?.offsetLeft || 0;
    const gap = 8;
    const padding = 12;
    const width = Math.min(viewportWidth - padding * 2, 260);
    const left = Math.min(
      Math.max(viewportOffsetLeft + padding, rect.left + viewportOffsetLeft),
      viewportOffsetLeft + viewportWidth - width - padding
    );
    const contentHeight = menuRef.current?.offsetHeight || 420;
    const spaceAbove = rect.top - padding - gap;
    const spaceBelow = viewportHeight - rect.bottom - padding - gap;
    const openDown = spaceAbove < 200 && spaceBelow > spaceAbove;
    const menuHeight = Math.min(
      contentHeight,
      Math.max(openDown ? spaceBelow : spaceAbove, 160)
    );
    const top = openDown
      ? rect.bottom + viewportOffsetTop + gap
      : Math.max(viewportOffsetTop + padding, rect.top + viewportOffsetTop - menuHeight - gap);
    setMenuStyle({
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      maxHeight: `${menuHeight}px`,
    });
  }, []);

  useEffect(() => {
    if (!showModelMenu || !mounted) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [mounted, showModelMenu, updateMenuPosition]);

  useLayoutEffect(() => {
    if (!showModelMenu || !mounted || !menuRef.current) return;
    updateMenuPosition();
  }, [mounted, showModelMenu, updateMenuPosition]);

  return (
    <div ref={triggerRef} className="relative">
      <button
        onClick={() => {
          if (!ready) return;
          if (!showModelMenu) updateMenuPosition();
          setShowModelMenu((value) => !value);
        }}
        className={`ai-control-chip flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--oa-blue)] disabled:opacity-50 ${fullWidth ? "w-full justify-between" : "max-w-full"}`}
        type="button"
        disabled={!ready}
      >
        <span className="inline-flex h-4 w-4 items-center justify-center shrink-0">
          {currentModel ? (
            <ModelGlyph model={currentModel.id} provider={currentModel.provider} size={14} />
          ) : (
            <span className="block h-4 w-4 rounded-sm bg-[var(--ai-panel-muted)]" aria-hidden />
          )}
        </span>
        <span className={fullWidth ? "max-w-[148px] truncate" : "max-w-[120px] truncate sm:max-w-[160px]"}>
          {currentModelLabel}
        </span>
      </button>

      {mounted ? createPortal(
        <AnimatePresence>
          {ready && showModelMenu && menuStyle ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60]"
                onClick={() => setShowModelMenu(false)}
              />
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="ai-shell ai-floating-panel fixed z-[61] rounded-xl p-2"
                style={{ ...menuStyle, position: "fixed", borderColor: "var(--oa-border)" }}
              >
                <div className="overflow-y-auto pr-1 mobile-scroll custom-scrollbar" style={{ maxHeight: menuStyle.maxHeight }}>
                  {Array.from(groupedModels.entries()).map(([provider, items], groupIdx) => (
                    <div key={provider}>
                      {groupIdx > 0 ? (
                        <div className="mx-2.5 my-1.5 h-px bg-[var(--ai-panel-border)]" aria-hidden />
                      ) : null}
                      <div className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {MODEL_GROUP_TITLES[provider] || provider}
                      </div>
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (!ready) return;
                            setShowModelMenu(false);
                            onModelChange(item.id);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:text-[13px] ${
                            model === item.id
                              ? "ai-primary-soft"
                              : "text-[var(--text-secondary)] hover:bg-[var(--ai-panel-muted)] hover:text-[var(--text-primary)]"
                          }`}
                          type="button"
                        >
                          <ModelGlyph model={item.id} provider={item.provider} size={16} />
                          <div className="min-w-0 flex-1 text-left leading-tight break-words">{item.name}</div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>,
        document.body
      ) : null}
    </div>
  );
}
