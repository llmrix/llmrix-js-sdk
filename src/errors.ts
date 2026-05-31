/**
 * Error classes for the Llmrix SDK.
 * @module errors
 */

/**
 * Base error class for all Llmrix SDK errors.
 *
 * All SDK-thrown errors extend this class so callers can
 * write a single `catch (e) { if (e instanceof LlmrixError) … }` guard.
 */
export class LlmrixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmrixError';
    // Restore prototype chain in transpiled ES5 output.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the server returns a non-2xx HTTP response.
 *
 * @example
 * ```ts
 * try {
 *   await client.conversations.get('nonexistent-id');
 * } catch (e) {
 *   if (e instanceof LlmrixApiError) {
 *     console.error(`HTTP ${e.status}: ${e.message}`);
 *   }
 * }
 * ```
 */
export class LlmrixApiError extends LlmrixError {
  /** HTTP status code returned by the server. */
  readonly status: number;

  /**
   * Raw response body text, available when the server did not return
   * a JSON error payload.
   */
  readonly body: string;

  constructor(status: number, message: string, body = '') {
    super(message);
    this.name = 'LlmrixApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Thrown when the server returns a 401 or 403 (and sometimes 503 in
 * gateway configurations) indicating that authentication failed.
 *
 * This is a specialisation of {@link LlmrixApiError} so all authentication
 * errors can be caught with either class.
 */
export class LlmrixAuthError extends LlmrixApiError {
  constructor(status: number, message: string, body = '') {
    super(status, message, body);
    this.name = 'LlmrixAuthError';
  }
}

/**
 * Thrown when a request is aborted due to the configured timeout.
 */
export class LlmrixTimeoutError extends LlmrixError {
  /** Timeout value (ms) that was exceeded. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs} ms`);
    this.name = 'LlmrixTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Thrown when the SSE stream is closed unexpectedly or the server sends
 * a malformed event payload.
 */
export class LlmrixStreamError extends LlmrixError {
  constructor(message: string) {
    super(message);
    this.name = 'LlmrixStreamError';
  }
}
