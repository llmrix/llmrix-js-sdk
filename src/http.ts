/**
 * Low-level HTTP client used by all Llmrix SDK resources.
 *
 * Responsibilities:
 * - Attaches `Authorization: Bearer <apiKey>` to every request.
 * - Serialises request bodies as JSON and sets the correct `Content-Type`.
 * - Deserialises successful JSON responses.
 * - Maps HTTP 4xx/5xx to {@link LlmrixApiError} / {@link LlmrixAuthError}.
 * - Enforces an optional per-request timeout via `AbortController`.
 *
 * @module http
 */

import { LlmrixApiError, LlmrixAuthError, LlmrixTimeoutError } from './errors';

/** @internal */
export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Extra headers merged on top of the default set. */
  headers?: Record<string, string>;
  /**
   * Override the global timeout (ms) for this specific request.
   * Pass `null` to disable timeout entirely (used for SSE streaming).
   */
  timeout?: number | null;
  /**
   * When `true` the raw `Response` is returned instead of parsing the body.
   * Used by the streaming chat endpoint.
   */
  raw?: boolean;
}

/**
 * Minimal fetch-based HTTP client shared by all resource classes.
 *
 * This class is intentionally kept thin — it has no retry logic, no caching,
 * and no interceptors beyond auth and error mapping.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultTimeout: number;

  constructor(baseUrl: string, apiKey: string, timeout = 60_000) {
    // Normalise: strip trailing slash so we can safely prefix with '/'.
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.defaultTimeout = timeout;
  }

  /**
   * Resolves a path relative to `baseUrl`.
   * @internal
   */
  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  /**
   * Builds the default request headers, merging any caller-supplied extras.
   * @internal
   */
  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      ...extra,
    };
  }

  /**
   * Issues an HTTP request and returns the parsed JSON response body.
   *
   * @throws {LlmrixAuthError} on 401 / 403 responses.
   * @throws {LlmrixApiError} on any other non-2xx response.
   * @throws {LlmrixTimeoutError} when the request exceeds the timeout.
   */
  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers: extraHeaders = {},
      raw = false,
    } = opts;

    // `null` means "no timeout" (used for long-lived SSE streams).
    // `undefined` falls back to the client default.
    const timeoutMs: number | null =
      opts.timeout === null ? null : (opts.timeout ?? this.defaultTimeout);

    const controller = new AbortController();
    const timerId =
      timeoutMs !== null
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    const requestHeaders: Record<string, string> = this.headers(extraHeaders);
    let bodyStr: string | undefined;

    if (body !== undefined) {
      bodyStr = JSON.stringify(body);
      requestHeaders['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(this.url(path), {
        method,
        headers: requestHeaders,
        body: bodyStr,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (timerId !== null) clearTimeout(timerId);
      // AbortController fires a DOMException with name "AbortError".
      if (
        err instanceof Error &&
        (err.name === 'AbortError' || err.name === 'TimeoutError')
      ) {
        throw new LlmrixTimeoutError(timeoutMs ?? 0);
      }
      throw err;
    }

    if (timerId !== null) clearTimeout(timerId);

    if (raw) {
      // Caller wants the raw Response (streaming use-case).
      // We still surface auth errors before handing the stream back.
      if (response.status === 401 || response.status === 403) {
        const text = await response.text();
        throw new LlmrixAuthError(response.status, this.extractMessage(text), text);
      }
      if (!response.ok) {
        const text = await response.text();
        throw new LlmrixApiError(response.status, this.extractMessage(text), text);
      }
      return response as unknown as T;
    }

    if (!response.ok) {
      // throwForStatus always throws; the cast convinces TypeScript that
      // execution cannot continue past this point.
      return await this.throwForStatus(response) as never;
    }

    // 204 No Content — return undefined cast as T (caller should type as void).
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const json: unknown = await response.json();
    return json as T;
  }

  /**
   * Convenience helper for `GET` requests.
   */
  async get<T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...opts, method: 'GET' });
  }

  /**
   * Convenience helper for `POST` requests.
   */
  async post<T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...opts, method: 'POST', body });
  }

  /**
   * Convenience helper for `PATCH` requests.
   */
  async patch<T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...opts, method: 'PATCH', body });
  }

  /**
   * Convenience helper for `DELETE` requests.
   */
  async delete<T = void>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...opts, method: 'DELETE' });
  }

  /**
   * Issues a raw streaming `POST` request and returns the `Response` object
   * without consuming the body.
   *
   * The caller is responsible for reading `response.body`.
   */
  async postStream(path: string, body?: unknown): Promise<Response> {
    return this.request<Response>(path, {
      method: 'POST',
      body,
      raw: true,
      // Streaming requests must not time out at the transport level —
      // the caller manages termination via the SSE `run_end` event or
      // the explicit /stop endpoint.
      timeout: null,
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async throwForStatus(response: Response): Promise<never> {
    const text = await response.text();
    const message = this.extractMessage(text);

    if (response.status === 401 || response.status === 403) {
      throw new LlmrixAuthError(response.status, message, text);
    }
    throw new LlmrixApiError(response.status, message, text);
  }

  /**
   * Attempts to extract a human-readable message from a JSON error body,
   * falling back to the raw text.
   */
  private extractMessage(text: string): string {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed['message'] === 'string') return parsed['message'];
      if (typeof parsed['detail'] === 'string') return parsed['detail'];
      if (typeof parsed['error'] === 'string') return parsed['error'];
    } catch {
      // Not JSON — use raw text.
    }
    return text || 'Unknown error';
  }
}
