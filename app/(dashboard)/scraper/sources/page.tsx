import { connection } from "next/server";
import { SourceManager } from "@/components/scraper/source-manager";
import { requirePageSession } from "@/lib/auth";
import { listScraperSources } from "@/lib/scraper/services/sources";
import { toScraperActor } from "@/lib/scraper/types";

export default async function ScraperSourcesPage() {
  await connection();
  const current = await requirePageSession();
  const sources = await listScraperSources(toScraperActor(current.user));
  const serializedSources = sources.map((source) => ({
    ...source,
    lastRunAt: source.lastRunAt ? source.lastRunAt.toISOString() : null
  }));

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <SourceManager initialSources={serializedSources} canManageSystem={current.user.role === "admin"} />
    </div>
  );
}
