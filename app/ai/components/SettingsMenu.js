"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Settings2, MessageSquareQuote, X, Globe2 } from "lucide-react";
import SystemPromptModal from "./SystemPromptModal";

export default function SettingsMenu({
  chatSystemPrompt,
  onChatSystemPromptSave,
  systemPrompts,
  addSystemPrompt,
  updateSystemPrompt,
  deleteSystemPrompt,
  webSearch,
  setWebSearch,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const mounted = typeof window !== "undefined";

  return (
    <div className="relative">
      <button
        onClick={() => setShowSettings((value) => !value)}
        className={`ai-control-chip flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm transition-colors ${showSettings
          ? "ai-primary-soft"
          : "text-[var(--text-secondary)]"
          }`}
        type="button"
      >
        <Settings2 size={14} />
        <span className="hidden sm:inline">设置</span>
      </button>

      {mounted ? createPortal(
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
              onClick={() => setShowSettings(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className="ai-shell ai-floating-panel w-full max-w-sm overflow-hidden rounded-xl"
              >
                <div className="flex items-center justify-between border-b border-[var(--ai-panel-border)] px-5 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <Settings2 size={16} className="text-[var(--ai-accent-strong)]" />
                    对话设置
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--ai-panel-muted)] hover:text-[var(--text-primary)]"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="mb-2 block px-1 text-xs font-medium text-[var(--text-muted)]">
                      系统提示词
                    </label>
                    <button
                      onClick={() => {
                        setShowSettings(false);
                        setShowPromptModal(true);
                      }}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-[var(--ai-panel-border)] bg-[var(--oa-card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--oa-paper-soft)]"
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquareQuote size={15} />
                        配置提示词
                      </span>
                      <span className="rounded-full bg-[var(--ai-panel-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                        {chatSystemPrompt ? "已设置" : "默认无"}
                      </span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block px-1 text-xs font-medium text-[var(--text-muted)]">
                      联网搜索
                    </label>
                    <button
                      onClick={() => {
                        setWebSearch?.((current) => ({
                          ...(current && typeof current === "object" ? current : {}),
                          enabled: !current?.enabled,
                        }));
                      }}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-lg border border-[var(--ai-panel-border)] bg-[var(--oa-card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--oa-paper-soft)] ${
                        webSearch?.enabled ? "border-[var(--oa-blue)] text-[var(--oa-blue)]" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Globe2 size={15} />
                        {webSearch?.enabled ? "已开启 Tavily 联网" : "开启 Tavily 联网"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        webSearch?.enabled
                          ? "bg-primary text-primary-foreground"
                          : "bg-[var(--ai-panel-muted)] text-[var(--text-secondary)]"
                      }`}>
                        {webSearch?.enabled ? "已开启" : "已关闭"}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      ) : null}
      <SystemPromptModal
        open={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        chatSystemPrompt={chatSystemPrompt}
        onChatSystemPromptSave={onChatSystemPromptSave}
        systemPrompts={systemPrompts}
        addSystemPrompt={addSystemPrompt}
        updateSystemPrompt={updateSystemPrompt}
        deleteSystemPrompt={deleteSystemPrompt}
      />
    </div>
  );
}
