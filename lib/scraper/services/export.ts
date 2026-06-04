import * as XLSX from "xlsx";
import type { ScraperRecordDoc } from "@/lib/scraper/types";
import { toScraperExportRow, type ScraperExportContext } from "@/lib/scraper/record-view";

export function buildScraperFlatWorkbook(records: ScraperRecordDoc[], context: ScraperExportContext = {}) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(records.map((item) => toScraperExportRow(item, context))),
    "数据"
  );
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
