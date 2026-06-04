import { connection } from "next/server";
import { requirePageSession } from "@/lib/auth";
import { listScraperRunReports } from "@/lib/scraper/services/runs";
import { toScraperActor } from "@/lib/scraper/types";
import { Button } from "@/components/ui/button";
import { ReportsList } from "@/components/scraper/reports-list";
import { Download } from "lucide-react";

export default async function ScraperReportsPage({
  searchParams
}: {
  searchParams?: Promise<{ sourceId?: string | string[] }>;
}) {
  await connection();
  const current = await requirePageSession();
  const actor = toScraperActor(current.user);
  const params = await searchParams;
  const sourceIdParam = params?.sourceId;
  const sourceIds = Array.isArray(sourceIdParam) ? sourceIdParam : sourceIdParam ? [sourceIdParam] : [];
  const reports = await listScraperRunReports(actor, 50, { sourceIds });
  const serializedReports = reports.map((report) => ({
    ...report,
    createdAt: report.createdAt.toISOString(),
    completedAt: report.completedAt ? report.completedAt.toISOString() : null,
    records: report.records.map((record) => ({
      ...record,
      publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString()
    }))
  }));

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex justify-end">
        <Button asChild className="shrink-0 gap-2">
          <a href="/api/scraper/records/export">
            <Download className="h-4 w-4" />
            导出全部
          </a>
        </Button>
      </div>
      <ReportsList initialReports={serializedReports} />
    </div>
  );
}
