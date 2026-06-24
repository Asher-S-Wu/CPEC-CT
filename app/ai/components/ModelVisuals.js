import { getModelProvider } from "@/lib/ai/shared/models";

const PROVIDER_ICON_URLS = Object.freeze({
  glm: "https://cdn.marmot-cloud.com/storage/zenmux/2025/10/15/bkWpB0o/Property-1Zai.svg",
  kimi: "https://cdn.marmot-cloud.com/storage/zenmux/2025/10/15/mitcnMm/Property-1KIMI.svg",
  qwen: "https://cdn.marmot-cloud.com/storage/zenmux/2026/04/01/qeMamJm/Property-1Qwen.svg",
  deepseek: "https://cdn.marmot-cloud.com/storage/zenmux/2025/10/15/tmeJLqx/Property-1deepseek.svg",
});

const FALLBACK_STYLE = {
  label: "AI",
  bg: "hsl(var(--primary))",
  color: "hsl(var(--primary-foreground))",
};

function resolveProvider(model, provider) {
  if (provider) return provider;
  return getModelProvider(model);
}

function ProviderIcon({ provider, size, rounded }) {
  const iconUrl = PROVIDER_ICON_URLS[provider];

  if (iconUrl) {
    return (
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: rounded ? Math.round(size * 0.22) : Math.round(size * 0.3),
        }}
        className="inline-flex shrink-0 items-center justify-center overflow-hidden bg-[var(--oa-card-bg)]"
      >
        <img
          src={iconUrl}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }

  const style = FALLBACK_STYLE;
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: style.bg,
        color: style.color,
        borderRadius: rounded ? Math.round(size * 0.22) : Math.round(size * 0.3),
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
        fontWeight: 800,
      }}
      className="inline-flex shrink-0 items-center justify-center"
    >
      {style.label}
    </span>
  );
}

export function ModelGlyph({ model, provider, size = 16 }) {
  return <ProviderIcon provider={resolveProvider(model, provider)} size={size} rounded={false} />;
}

export function ModelAvatar({ model, size = 24 }) {
  return <ProviderIcon provider={resolveProvider(model)} size={size} rounded />;
}
