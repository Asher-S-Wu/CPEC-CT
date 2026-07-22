import type { StoredFileDescriptor, StorageScope } from "@/lib/storage/types";

interface UploadStoredFileOptions {
  scope: StorageScope;
  model?: string;
  mode?: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

function parseErrorMessage(xhr: XMLHttpRequest) {
  const payload = xhr.response && typeof xhr.response === "object" ? xhr.response : null;
  return payload?.detail || payload?.message || payload?.error || `上传失败（${xhr.status}）`;
}

export function uploadStoredFile(file: File, options: UploadStoredFileOptions) {
  return new Promise<StoredFileDescriptor>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const handleAbort = () => xhr.abort();
    xhr.open("POST", "/api/files");
    xhr.responseType = "json";
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    xhr.setRequestHeader("X-File-Scope", options.scope);
    if (options.model) xhr.setRequestHeader("X-File-Model", options.model);
    if (options.mode) xhr.setRequestHeader("X-File-Mode", options.mode);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      options.signal?.removeEventListener("abort", handleAbort);
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.file) {
        options.onProgress?.(100);
        resolve(xhr.response.file as StoredFileDescriptor);
        return;
      }
      reject(new Error(parseErrorMessage(xhr)));
    };
    xhr.onerror = () => {
      options.signal?.removeEventListener("abort", handleAbort);
      reject(new Error("网络连接失败，文件未上传"));
    };
    xhr.onabort = () => {
      options.signal?.removeEventListener("abort", handleAbort);
      reject(new DOMException("上传已取消", "AbortError"));
    };

    if (options.signal?.aborted) {
      reject(new DOMException("上传已取消", "AbortError"));
      return;
    }
    options.signal?.addEventListener("abort", handleAbort, { once: true });
    xhr.send(file);
  });
}
