"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "确认操作",
  message = "确定要执行此操作吗？",
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
}: ConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onConfirm();
  };

  const handleCancel = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onClose();
  };

  useEffect(() => {
    if (open) {
      setIsProcessing(false);
    }
  }, [open]);

  // 键盘事件处理：Enter 确认，Escape 取消
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isProcessing) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isProcessing]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-xl border border-[var(--oa-card-border)] bg-[var(--oa-card-bg)] p-6"
          >
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="absolute right-4 top-4 text-[var(--oa-muted)] transition-colors hover:text-[var(--oa-ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${danger ? "bg-[var(--oa-red-soft-bg)] text-[var(--oa-red)]" : "bg-[var(--oa-paper-soft)] text-[var(--oa-muted)]"
                  }`}
              >
                <AlertTriangle size={24} />
              </div>

              <h3 className="mb-2 text-lg font-semibold text-[var(--oa-ink)]">
                {title}
              </h3>
              <p className="mb-6 text-sm text-[var(--oa-muted)]">{message}</p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="flex-1 rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-control-bg)] px-4 py-2.5 text-sm font-medium text-[var(--oa-ink)] transition-colors hover:bg-[var(--oa-paper-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${danger
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
