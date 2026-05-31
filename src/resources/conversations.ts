/**
 * Resource class for the `/conversations` API.
 *
 * @module resources/conversations
 */

import { HttpClient } from '../http';
import {
  Conversation,
  CreateConversationOptions,
  UpdateConversationOptions,
  Message,
  PageResult,
  PaginationParams,
} from '../types';
import { Paths } from '../paths';

/**
 * Provides CRUD operations for Llmrix conversations and access to
 * conversation message history.
 *
 * Obtain an instance via `client.conversations`.
 */
export class ConversationsResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  // ---------------------------------------------------------------------------
  // Conversation CRUD
  // ---------------------------------------------------------------------------

  /**
   * Creates a new conversation.
   *
   * @param opts - Optional initial properties for the conversation.
   * @returns The newly created {@link Conversation}.
   *
   * @example
   * ```ts
   * const conv = await client.conversations.create({ title: 'My chat' });
   * console.log(conv.id); // "550e8400-e29b-41d4-a716-446655440000"
   * ```
   */
  async create(opts: CreateConversationOptions = {}): Promise<Conversation> {
    return this.http.post<Conversation>(Paths.conversations, opts);
  }

  /**
   * Returns a cursor-paginated list of conversations, newest first.
   *
   * @param opts - Pagination options (`lastId` cursor, `size`).
   * @returns A {@link PageResult} containing the requested page.
   *
   * @example
   * ```ts
   * let page = await client.conversations.list({ size: 20 });
   * while (page.has_more) {
   *   page = await client.conversations.list({
   *     lastId: page.items.at(-1)!.seq,
   *     size: 20,
   *   });
   * }
   * ```
   */
  async list(opts: PaginationParams = {}): Promise<PageResult<Conversation>> {
    const params = buildPaginationQuery(opts);
    const query = params ? `?${params}` : '';
    return this.http.get<PageResult<Conversation>>(`${Paths.conversations}${query}`);
  }

  /**
   * Retrieves a single conversation by its ID.
   *
   * @param id - The conversation ID (UUID / `thread_id`).
   * @returns The matching {@link Conversation}.
   * @throws {LlmrixApiError} with status 404 if not found.
   */
  async get(id: string): Promise<Conversation> {
    return this.http.get<Conversation>(Paths.conversation(id));
  }

  /**
   * Updates mutable fields on an existing conversation.
   *
   * @param id - The conversation ID.
   * @param opts - Fields to update.
   * @returns The updated {@link Conversation}.
   */
  async update(id: string, opts: UpdateConversationOptions): Promise<Conversation> {
    return this.http.patch<Conversation>(
      Paths.conversationUpdate(id),
      opts,
    );
  }

  /**
   * Permanently deletes a conversation and all its messages.
   *
   * @param id - The conversation ID.
   */
  async delete(id: string): Promise<void> {
    await this.http.delete<void>(Paths.conversationDelete(id));
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  /**
   * Returns a cursor-paginated list of messages for a conversation.
   *
   * Messages are returned in chronological order (oldest first within each
   * page).  Use `lastId` with the smallest `seq` in the current page to load
   * older history.
   *
   * @param conversationId - The conversation ID.
   * @param opts - Pagination options.
   * @returns A {@link PageResult} of {@link Message} objects.
   *
   * @example
   * ```ts
   * const page = await client.conversations.messages(conv.id, { size: 50 });
   * for (const msg of page.items) {
   *   console.log(`[${msg.role}] ${msg.content}`);
   * }
   * ```
   */
  async messages(
    conversationId: string,
    opts: PaginationParams = {},
  ): Promise<PageResult<Message>> {
    const params = buildPaginationQuery(opts);
    const query = params ? `?${params}` : '';
    return this.http.get<PageResult<Message>>(
      `${Paths.conversationMessages(conversationId)}${query}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Serialises pagination options to a URL query string (without leading `?`). */
function buildPaginationQuery(opts: PaginationParams): string {
  const parts: string[] = [];
  if (opts.lastId !== undefined) {
    parts.push(`lastId=${encodeURIComponent(String(opts.lastId))}`);
  }
  if (opts.size !== undefined) {
    parts.push(`size=${encodeURIComponent(String(opts.size))}`);
  }
  return parts.join('&');
}
