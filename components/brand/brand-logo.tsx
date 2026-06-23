import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div
      className={cn("brand-mark h-8 w-8 rounded-lg", className)}
      role="img"
      aria-label="智创 AI"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none">
        <path
          d="M8 24L24 8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M8 8C8 8 14 8 16 8C18 8 24 8 24 8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M8 24C8 24 14 24 16 24C18 24 24 24 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="3" fill="currentColor" />
      </svg>
    </div>
  );
}
