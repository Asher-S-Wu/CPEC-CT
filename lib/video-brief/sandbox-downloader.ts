import crypto from "crypto";
import { createOrConnectSandbox, readSandboxFile } from "@/lib/ai/server/sandbox/vercelSandbox";
import { logWarn } from "@/lib/logger";
import { saveVideoBuffer } from "@/lib/media/storage";

const VIDEO_BRIEF_TOOLS_MARKER = "/vercel/sandbox/ai-studio/bootstrap/video-brief-tools-2026-06-16";
const YT_DLP_FORMAT = "bv*[height<=480][ext=mp4]+ba[ext=m4a]/bv*[height<=480]+ba/b[height<=480]/b";

interface SandboxVideoInfo {
  title: string;
  author: string;
  coverUrl: string;
  durationSeconds: number;
  canonicalUrl: string;
}

export interface SandboxVideoDownloadResult extends SandboxVideoInfo {
  blobUrl: string;
  mimeType: string;
}

function encodeShell(value: string) {
  return JSON.stringify(value);
}

function sanitizeSegment(value: string, fallback = "video") {
  const normalized = String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120);
  return normalized || fallback;
}

async function readCommandText(command: any) {
  const [stdout, stderr] = await Promise.all([
    command.stdout().catch(() => ""),
    command.stderr().catch(() => ""),
  ]);
  return { stdout: String(stdout || ""), stderr: String(stderr || "") };
}

async function runSandboxCommand(sandbox: any, input: { cmd: string; args?: string[]; cwd?: string; sudo?: boolean }) {
  const command = await sandbox.runCommand(input);
  const output = await readCommandText(command);
  return { command, ...output };
}

async function assertCommandOk(result: Awaited<ReturnType<typeof runSandboxCommand>>, message: string) {
  if (result.command.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || message);
  }
}

async function ensureSandboxVideoTools(sandbox: any) {
  const existing = await sandbox.readFile({ path: VIDEO_BRIEF_TOOLS_MARKER }).catch(() => null);
  if (existing) return;

  const install = await runSandboxCommand(sandbox, {
    cmd: "bash",
    args: [
      "-lc",
      [
        "dnf install -y yt-dlp ffmpeg-free",
      ].join(" && "),
    ],
    sudo: true,
  });
  await assertCommandOk(install, "安装视频解析工具失败");

  const verify = await runSandboxCommand(sandbox, {
    cmd: "bash",
    args: ["-lc", "command -v yt-dlp >/dev/null 2>&1 && command -v ffmpeg >/dev/null 2>&1"],
  });
  await assertCommandOk(verify, "视频解析工具不可用");

  await sandbox.writeFiles([
    { path: VIDEO_BRIEF_TOOLS_MARKER, content: Buffer.from(new Date().toISOString(), "utf8") },
  ]);
}

function getPrintedOutputPath(stdout: string) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reverse()
    .find((line) => /^\/.+\.(mp4|m4v|mov|webm|mkv)$/i.test(line)) || "";
}

async function findSandboxFile(sandbox: any, workdir: string, baseName: string, pattern: string) {
  const result = await runSandboxCommand(sandbox, {
    cmd: "bash",
    args: [
      "-lc",
      `find ${encodeShell(`${workdir}/artifacts`)} -maxdepth 1 -type f -name ${encodeShell(`${baseName}${pattern}`)} -print | head -n 1`,
    ],
  });
  await assertCommandOk(result, "读取视频文件路径失败");
  return result.stdout.trim();
}

async function readInfoJson(sandbox: any, workdir: string, baseName: string): Promise<Partial<SandboxVideoInfo>> {
  const infoPath = await findSandboxFile(sandbox, workdir, baseName, "*.info.json").catch(() => "");
  if (!infoPath) return {};

  try {
    const file = await readSandboxFile({ sandbox, remotePath: infoPath });
    const payload = JSON.parse(file.text || "{}");
    return {
      title: typeof payload.title === "string" ? payload.title.trim() : "",
      author: typeof payload.uploader === "string" ? payload.uploader.trim() : "",
      coverUrl: typeof payload.thumbnail === "string" ? payload.thumbnail.trim() : "",
      durationSeconds: Number.isFinite(Number(payload.duration)) ? Math.max(0, Number(payload.duration)) : 0,
      canonicalUrl: typeof payload.webpage_url === "string" ? payload.webpage_url.trim() : "",
    };
  } catch (error) {
    logWarn("video-brief", "read yt-dlp info json", error);
    return {};
  }
}

export async function downloadVideoWithYtDlp(input: {
  url: string;
  userId: string;
  signal?: AbortSignal;
}): Promise<SandboxVideoDownloadResult> {
  const runId = crypto.randomUUID();
  const baseName = sanitizeSegment(`video-${runId}`);
  const { sandbox, session } = await createOrConnectSandbox({
    userId: input.userId,
    conversationId: `video-brief-${runId}`,
    purpose: "agent",
    allowInternetAccess: true,
  });

  try {
    await ensureSandboxVideoTools(sandbox);
    const outputTemplate = `${session.workdir}/artifacts/${baseName}.%(ext)s`;
    const download = await runSandboxCommand(sandbox, {
      cmd: "yt-dlp",
      args: [
        "--no-playlist",
        "--no-progress",
        "--force-overwrites",
        "--merge-output-format",
        "mp4",
        "--remux-video",
        "mp4",
        "--write-info-json",
        "--print",
        "after_move:filepath",
        "--format",
        YT_DLP_FORMAT,
        "--output",
        outputTemplate,
        input.url,
      ],
      cwd: session.workdir,
    });
    await assertCommandOk(download, "视频下载或合并失败");

    const outputPath = getPrintedOutputPath(download.stdout) ||
      await findSandboxFile(sandbox, session.workdir, baseName, "*.mp4");
    if (!outputPath) {
      throw new Error("没有生成可分析的视频文件");
    }

    if (input.signal?.aborted) {
      throw input.signal.reason instanceof Error ? input.signal.reason : new Error("请求已取消");
    }

    const [videoFile, info] = await Promise.all([
      readSandboxFile({ sandbox, remotePath: outputPath }),
      readInfoJson(sandbox, session.workdir, baseName),
    ]);
    if (!videoFile.buffer?.length) {
      throw new Error("生成的视频文件为空");
    }

    const saved = await saveVideoBuffer(videoFile.buffer, "video/mp4");
    return {
      title: info.title || "",
      author: info.author || "",
      coverUrl: info.coverUrl || "",
      durationSeconds: info.durationSeconds || 0,
      canonicalUrl: info.canonicalUrl || input.url,
      blobUrl: saved.blobUrl,
      mimeType: saved.mimeType,
    };
  } finally {
    await sandbox.stop().catch(() => {});
  }
}
