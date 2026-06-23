"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import ConfirmModal from "./confirm-modal";

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      // 上一个未关闭的请求直接按取消处理，避免 Promise 永远挂起
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
      resolverRef.current = resolve;
      setState({ open: true, ...options });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        open={state.open}
        onClose={() => close(false)}
        onConfirm={() => close(true)}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        danger={state.danger}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
