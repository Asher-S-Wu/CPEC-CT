import {
  scraperRecordsCollection,
  scraperMigrationsCollection,
  scraperRunArtifactsCollection,
  scraperRunsCollection,
  scraperSourcesCollection
} from "@/lib/scraper/db";
import { SCRAPER_SOURCE_KINDS } from "@/lib/scraper/types";
import { logError } from "@/lib/logger";

let scraperBootstrapPromise: Promise<void> | null = null;
let scraperBootstrapReady = false;

export async function ensureScraperBootstrap() {
  if (scraperBootstrapReady) {
    return;
  }

  if (!scraperBootstrapPromise) {
    scraperBootstrapPromise = (async () => {
      try {
        await runScraperBootstrap();
        scraperBootstrapReady = true;
      } catch (error) {
        logError("scraper", "initialize bootstrap", error);
        throw error;
      } finally {
        if (!scraperBootstrapReady) {
          scraperBootstrapPromise = null;
        }
      }
    })();
  }

  await scraperBootstrapPromise;
}

async function runScraperBootstrap() {
  await resetScraperDataForTavily();
  await Promise.all([ensureScraperIndexes(), cleanupDeprecatedScraperSources()]);
}

const TAVILY_RESET_MIGRATION_ID = "2026-06-23-tavily-scraper-reset-v1";

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && Number((error as { code?: number }).code) === 11000;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetScraperDataForTavily() {
  const migrations = await scraperMigrationsCollection();
  const existing = await migrations.findOne({ _id: TAVILY_RESET_MIGRATION_ID });
  if (existing?.status === "completed") {
    return;
  }

  let ownsMigration = false;
  if (!existing) {
    try {
      await migrations.insertOne({
        _id: TAVILY_RESET_MIGRATION_ID,
        status: "running",
        startedAt: new Date(),
        completedAt: null
      });
      ownsMigration = true;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }
  }

  if (!ownsMigration) {
    while (true) {
      const state = await migrations.findOne({ _id: TAVILY_RESET_MIGRATION_ID });
      if (state?.status === "completed") {
        return;
      }
      await sleep(250);
    }
  }

  try {
    const [sources, runs, records, artifacts] = await Promise.all([
      scraperSourcesCollection(),
      scraperRunsCollection(),
      scraperRecordsCollection(),
      scraperRunArtifactsCollection()
    ]);
    await Promise.all([
      sources.deleteMany({}),
      runs.deleteMany({}),
      records.deleteMany({}),
      artifacts.deleteMany({})
    ]);
    await migrations.updateOne(
      { _id: TAVILY_RESET_MIGRATION_ID },
      { $set: { status: "completed", completedAt: new Date() } }
    );
  } catch (error) {
    await migrations.deleteOne({ _id: TAVILY_RESET_MIGRATION_ID });
    throw error;
  }
}

async function ensureScraperIndexes() {
  const [sources, runs, records, artifacts] = await Promise.all([
    scraperSourcesCollection(),
    scraperRunsCollection(),
    scraperRecordsCollection(),
    scraperRunArtifactsCollection()
  ]);

  const existingRecordIndexes = await records.indexes();
  const deprecatedUniqueDedupeIndex = existingRecordIndexes.find(
    (index) => index.unique && index.key?.sourceId === 1 && index.key?.dedupeKey === 1
  );
  if (deprecatedUniqueDedupeIndex?.name) {
    await records.dropIndex(deprecatedUniqueDedupeIndex.name);
  }

  await Promise.all([
    sources.createIndex({ kind: 1, scope: 1, ownerId: 1 }),
    runs.createIndex({ sourceId: 1, createdAt: -1 }),
    runs.createIndex(
      { idempotencyKey: 1 },
      {
        unique: true,
        partialFilterExpression: { idempotencyKey: { $type: "string" } }
      }
    ),
    records.createIndex({ runId: 1, kind: 1, url: 1 }, { unique: true }),
    records.createIndex({ sourceId: 1, dedupeKey: 1 }),
    records.createIndex({ sourceId: 1, updatedAt: -1 }),
    records.createIndex({ runId: 1, createdAt: 1 }),
    artifacts.createIndex({ runId: 1, createdAt: -1 })
  ]);
}

async function cleanupDeprecatedScraperSources() {
  const sources = await scraperSourcesCollection();
  await sources.deleteMany({
    scope: "system",
    kind: {
      $nin: [...SCRAPER_SOURCE_KINDS]
    }
  });
}
