export class StorageError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400, options?: ErrorOptions) {
    super(message, options);
    this.name = "StorageError";
    this.code = code;
    this.status = status;
  }
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}
