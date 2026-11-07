export class durontoError extends Error {
  readonly code: string;
  readonly hint?: string;
  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "durontoError";
    this.code = code;
    if (hint !== undefined) this.hint = hint;
  }
}

export function err(code: string, message: string, hint?: string): never {
  throw new durontoError(code, message, hint);
}