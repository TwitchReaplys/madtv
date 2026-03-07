export class ApiClientError extends Error {
  constructor(message: string, public readonly code?: string | null) {
    super(message);
    this.name = "ApiClientError";
  }
}
