/**
 * LlmrixClient — the main entry point for the Llmrix TypeScript SDK.
 *
 * @module client
 *
 * @example
 * ```ts
 * import { LlmrixClient } from '@llmrix/sdk';
 *
 * const client = new LlmrixClient({
 *   baseUrl: 'http://localhost:8899',
 *   apiKey: 'sk-xxx',
 * });
 *
 * const conv = await client.conversations.create({ title: 'Hello' });
 *
 * for await (const event of client.chat(conv.id).send('Hi!')) {
 *   if (event.channel === 'messages' && event.type === 'message_chunk') {
 *     process.stdout.write(event.content);
 *   }
 * }
 * ```
 */

import { LlmrixClientOptions } from './types';
import { HttpClient } from './http';
import { ConversationsResource } from './resources/conversations';
import { ChatResource } from './resources/chat';
import { CronResource } from './resources/cron';
import { AgentResource } from './resources/agent';

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * The top-level Llmrix SDK client.
 *
 * All API interactions go through this class.  Instantiate it once and reuse
 * it across your application.
 *
 * @example
 * ```ts
 * const client = new LlmrixClient({
 *   baseUrl: 'http://localhost:8899',
 *   apiKey: process.env.LLMRIX_API_KEY!,
 *   timeout: 30_000,
 * });
 * ```
 */
export class LlmrixClient {
  /**
   * Access conversation CRUD and message history.
   *
   * @see {@link ConversationsResource}
   */
  readonly conversations: ConversationsResource;

  /**
   * Manage scheduled cron tasks.
   *
   * @see {@link CronResource}
   */
  readonly cron: CronResource;

  /**
   * Manage agent definitions (cloud mode only).
   *
   * @see {@link AgentResource}
   */
  readonly agents: AgentResource;

  /** @internal */
  private readonly http: HttpClient;

  /**
   * Creates a new `LlmrixClient`.
   *
   * @param options - Client configuration.
   * @param options.baseUrl  - Base URL of the Llmrix server (no trailing slash).
   * @param options.apiKey   - Bearer token used for authentication.
   * @param options.timeout  - Optional request timeout in ms (default 60 s).
   */
  constructor(options: LlmrixClientOptions) {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.http = new HttpClient(options.baseUrl, options.apiKey, timeout);
    this.conversations = new ConversationsResource(this.http);
    this.cron = new CronResource(this.http);
    this.agents = new AgentResource(this.http);
  }

  // ---------------------------------------------------------------------------
  // Chat / streaming
  // ---------------------------------------------------------------------------

  /**
   * Returns a {@link ChatResource} scoped to the given conversation.
   *
   * The resource exposes:
   * - `send(message, opts?)` — stream an agent turn as an `AsyncIterable<StreamEvent>`
   * - `stop()` — abort the current run
   * - `decide(decisions)` — submit HITL decisions
   *
   * @param conversationId - The target conversation ID (UUID).
   * @returns A {@link ChatResource} bound to `conversationId`.
   *
   * @example
   * ```ts
   * const stream = client.chat(conv.id).send('What is the capital of France?');
   * for await (const event of stream) {
   *   if (event.channel === 'messages' && event.type === 'message_chunk') {
   *     process.stdout.write(event.content);
   *   }
   *   if (event.channel === 'lifecycle' && event.type === 'run_end') break;
   * }
   * ```
   */
  chat(conversationId: string): ChatResource {
    return new ChatResource(this.http, conversationId);
  }
}
