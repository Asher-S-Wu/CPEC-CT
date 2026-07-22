import path from "node:path";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { saveStoredBuffer } from "@/lib/storage/server";
import { VOLUME_ROOT } from "@/lib/storage/paths";
import { toStoredFileDescriptor } from "@/lib/storage/repository";
import { getAttachmentCategory, getFileExtension, normalizeMimeType } from "@/lib/ai/shared/attachments";

const PARSER_SCRIPT_PATH = path.join(process.cwd(), "scripts", "parser", "parse_attachment.py");
const MAX_STDIO_CHARS = 64 * 1024;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_VISUAL_ASSET_BYTES = 2 * 1024 * 1024;
const PARSER_TIMEOUT_MS = 180 * 1000;

function appendLimited(current, chunk) {
  if (current.length >= MAX_STDIO_CHARS) return current;
  return `${current}${chunk.toString("utf8")}`.slice(0, MAX_STDIO_CHARS);
}

function buildAbortError(signal) {
  const error = signal?.reason instanceof Error ? signal.reason : new Error("文件解析已取消");
  error.name = "AbortError";
  return error;
}

function getRuntimePath() {
  const runtimePath = process.env.PATH;
  if (!runtimePath) throw new Error("运行环境缺少 PATH，无法启动本地文件解析器");
  return runtimePath;
}

function runParserProcess(args, { cwd, signal }) {
  return new Promise((resolve, reject) => {
    const startedAt = new Date();
    let stdout = "";
    let stderr = "";
    let settled = false;
    const child = spawn("setpriv", [
      "--no-new-privs",
      "--",
      "prlimit",
      "--as=536870912",
      "--cpu=150",
      "--nproc=32",
      "--fsize=52428800",
      "--",
      "python3",
      ...args,
    ], {
      cwd,
      detached: true,
      env: {
        HOME: cwd,
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
        PATH: getRuntimePath(),
        PYTHONDONTWRITEBYTECODE: "1",
        PYTHONNOUSERSITE: "1",
        TMPDIR: cwd,
      },
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortHandler);
      callback();
    };
    const terminateChild = () => {
      if (!child.pid) return;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const abortHandler = () => {
      terminateChild();
      finish(() => reject(buildAbortError(signal)));
    };
    const timeout = setTimeout(() => {
      terminateChild();
      finish(() => reject(new Error("文件解析超时")));
    }, PARSER_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => { stdout = appendLimited(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = appendLimited(stderr, chunk); });
    child.once("error", (error) => finish(() => reject(new Error("无法启动本地文件解析器", { cause: error }))));
    child.once("exit", (code, terminationSignal) => finish(() => {
      const result = {
        exitCode: Number.isInteger(code) ? code : null,
        terminationSignal: terminationSignal || null,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      };
      if (code !== 0) {
        reject(new Error(result.stderr || `文件解析器异常退出（${terminationSignal || code}）`));
        return;
      }
      resolve(result);
    }));

    if (signal?.aborted) abortHandler();
    else signal?.addEventListener("abort", abortHandler, { once: true });
  });
}

function visualExtension(asset) {
  const extension = getFileExtension(asset?.name || "");
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(extension) ? extension : "";
}

async function saveVisualAssets(userId, visualAssets) {
  const saved = [];
  for (const [index, asset] of (Array.isArray(visualAssets) ? visualAssets : []).slice(0, 6).entries()) {
    const extension = visualExtension(asset);
    if (!extension || typeof asset?.dataBase64 !== "string") continue;
    const buffer = Buffer.from(asset.dataBase64, "base64");
    if (buffer.length <= 0 || buffer.length > MAX_VISUAL_ASSET_BYTES) continue;
    const mimeType = normalizeMimeType(asset.mimeType) || (extension === "jpg" || extension === "jpeg" ? "image/jpeg" : `image/${extension}`);
    const file = await saveStoredBuffer({
      userId,
      buffer,
      originalName: `document-asset-${index + 1}.${extension}`,
      mimeType,
      extension,
      category: "image",
      scope: "document-assets",
      maxBytes: MAX_VISUAL_ASSET_BYTES,
    });
    saved.push({
      fileId: file.fileId,
      url: file.url,
      mimeType: file.mimeType,
      size: file.size,
      label: typeof asset.label === "string" && asset.label ? asset.label : `视觉内容 ${index + 1}`,
      sourceType: typeof asset.sourceType === "string" && asset.sourceType ? asset.sourceType : "embedded-image",
      page: Number.isFinite(asset.page) ? asset.page : null,
      sheet: typeof asset.sheet === "string" && asset.sheet ? asset.sheet : null,
    });
  }
  return saved;
}

export async function parseAttachmentLocally({ userId, storedFile, absolutePath, signal }) {
  const workdir = await mkdtemp(path.join(VOLUME_ROOT, ".incoming", "parser-"));
  const outputPath = path.join(workdir, "result.json");
  const originalName = storedFile.originalName || "file";
  const extension = storedFile.extension || getFileExtension(originalName);

  try {
    const commandResult = await runParserProcess([
      PARSER_SCRIPT_PATH,
      "--input", absolutePath,
      "--output", outputPath,
      "--original-name", originalName,
      "--extension", extension,
      "--mime-type", storedFile.mimeType || "",
      "--max-pages", "120",
      "--max-sheets", "10",
      "--max-rows-per-sheet", "5000",
      "--max-cols", "50",
      "--max-cells", "100000",
    ], { cwd: workdir, signal });

    const outputStat = await stat(outputPath);
    if (outputStat.size <= 0 || outputStat.size > MAX_OUTPUT_BYTES) {
      throw new Error("文件解析结果大小异常");
    }
    const payload = JSON.parse(await readFile(outputPath, "utf8"));
    const visualAssets = await saveVisualAssets(userId, payload.visualAssets);
    const descriptor = toStoredFileDescriptor(storedFile);
    return {
      commandResult,
      prepared: {
        file: {
          ...descriptor,
          category: getAttachmentCategory({ extension, mimeType: storedFile.mimeType }),
          formatSummary: typeof payload.formatSummary === "string" ? payload.formatSummary : "",
          visualAssetCount: visualAssets.length,
          visualAssets,
        },
        extractedText: typeof payload.text === "string" ? payload.text : "",
        structuredText: typeof payload.structuredText === "string" ? payload.structuredText : "",
        formatSummary: typeof payload.formatSummary === "string" ? payload.formatSummary : "",
        visualAssets,
        pageCount: Number.isFinite(payload?.stats?.pageCount) ? payload.stats.pageCount : null,
        sheetCount: Number.isFinite(payload?.stats?.sheetCount) ? payload.stats.sheetCount : null,
        rowCount: Number.isFinite(payload?.stats?.rowCount) ? payload.stats.rowCount : null,
        cellCount: Number.isFinite(payload?.stats?.cellCount) ? payload.stats.cellCount : null,
        maxCols: Number.isFinite(payload?.stats?.maxCols) ? payload.stats.maxCols : null,
      },
    };
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
