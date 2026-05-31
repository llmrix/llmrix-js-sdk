/**
 * Resource class for the chat / streaming API.
 *
 * @module resources/chat
 */

import { HttpClient } from '../http';
import { LlmrixStreamError } from '../errors';
import { SendMessageOptions, HitlDecision } from '../types';
import { parseSseStream } from '../streaming/parser';
import { StreamEvent } from '../streaming/events';
import { Paths } from '../paths';

/**
 * Handles streaming chat interactions for a single conversation.
 *
 * Obtain an instance via `client.chat(conversationId)`.
 *
 * @example
 * ```ts
 * const chat = client.chat(conv.id);
 *
 * for await (const event of chat.send('What is 2 + 2?')) {
 *   if (event.channel === 'messages' && event.type === 'message_chunk') {
 *     process.stdout.write(event.content);
 *   }
 *   if (event.channel === 'lifecycle' && event.type === 'run_end') break;
 * }
 * ```
 */
export class ChatResource {
  /** @internal */
  constructor(
    private readonly http: HttpClient,
    private readonly conversationId: string,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Sends a user message and returns an `AsyncIterable` of {@link StreamEvent}
   * objects produced by the agent.
   *
   * The iterable terminates naturally when either:
   * - A `run_end` lifecycle event is received, **or**
   * - The server closes the SSE stream.
   *
   * Heartbeat frames are silently dropped and never yielded to the caller.
   *
   * @param message - The user message text.
   * @param opts - Optional overrides (model, thinking, attachments).
   * @returns An `AsyncIterable` of parsed {@link StreamEvent} objects.
   *
   * @throws {LlmrixApiError} if the server rejects the request with a
   *   non-2xx status before the stream starts.
   * @throws {LlmrixStreamError} if an unrecoverable SSE parse error occurs.
   *
   * @example
   * ```ts
   * const stream = client.chat(conv.id).send('Hello!');
   * for await (const event of stream) {
   *   if (event.channel === 'messages' && event.type === 'message_chunk') {
   *     process.stdout.write(event.content);
   *   }
   * }
   * ```
   */
  send(message: string, opts: SendMessageOptions = {}): AsyncIterable<StreamEvent> {
    const self = this;
    return {
      [Symbol.asyncIterator](): AsyncIterator<StreamEvent> {
        return self._streamIterator(message, opts);
      },
    };
  }

  /**
   * Requests the server to stop the currently-running agent turn.
   *
   * Safe to call even if no run is active — the server will return 200 with
   * a no-op.
   */
  async stop(): Promise<void> {
    await this.http.post<void>(Paths.chatStop(this.conversationId));
  }

  /**
   * Submits HITL (Human-in-the-Loop) decisions for a paused agent run.
   *
   * Call this after receiving a {@link HitlInterruptEvent} to resume the run.
   *
   * @param decisions - One decision per pending {@link HitlActionRequest}.
   *
   * @example
   * ```ts
   * if (event.channel === 'hitl' && event.type === 'hitl_interrupt') {
   *   await client.chat(conv.id).decide([{ type: 'approve' }]);
   * }
   * ```
   */
  async decide(decisions: HitlDecision[]): Promise<void> {
    await this.http.post<void>(Paths.chatHitlDecide(this.conversationId), { decisions });
  }

  // ---------------------------------------------------------------------------
  // Internal: async generator
  // ---------------------------------------------------------------------------

  /**
   * Core streaming logic — an `AsyncGenerator` that wraps the SSE response.
   * @internal
   */
  private async *_streamIterator(
    message: string,
    opts: SendMessageOptions,
  ): AsyncGenerator<StreamEvent> {
    const body: Record<string, unknown> = { message };
    if (opts.model !== undefined) body['model'] = opts.model;
    if (opts.thinking !== undefined) body['thinking'] = opts.thinking;
    if (opts.attachments !== undefined && opts.attachments.length > 0) {
      body['attachments'] = opts.attachments;
    }

    // Use a dedicated streaming POST that returns the raw Response.
    const response = await this.http.postStream(Paths.chat(this.conversationId), body);

    if (!response.body) {
      throw new LlmrixStreamError('Response body is null — SSE streaming is not supported by this environment.');
    }

    for await (const frame of parseSseStream(response.body)) {
      // Skip empty-data frames (e.g. bare event:heartbeat lines).
      if (!frame.data && frame.event !== 'heartbeat') {
        continue;
      }

      // Heartbeat frames — consume and skip.
      if (frame.event === 'heartbeat' || frame.data === '' ) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(frame.data);
      } catch {
        // Malformed JSON: log a warning and continue instead of crashing.
        console.warn(
          '[LlmrixSDK] Received SSE frame with unparseable JSON — skipping.',
          { event: frame.event, data: frame.data },
        );
        continue;
      }

      const event = this._deserializeEvent(parsed);
      if (event === null) {
        // Unknown / unrecognised event shape — skip gracefully.
        continue;
      }

      yield event;

      // Stop consuming the stream once the run lifecycle ends.
      if (event.channel === 'lifecycle' && event.type === 'run_end') {
        return;
      }
      // Also stop on terminal error events.
      if (
        event.channel === 'error' &&
        (event.type === 'error' || event.type === 'cancelled')
      ) {
        return;
      }
    }
  }

  /**
   * Converts a raw parsed JSON object into a typed {@link StreamEvent}.
   *
   * Returns `null` if the object does not match any known event shape.
   * @internal
   */
  private _deserializeEvent(raw: unknown): StreamEvent | null {
    if (
      raw === null ||
      typeof raw !== 'object' ||
      Array.isArray(raw)
    ) {
      return null;
    }

    const obj = raw as Record<string, unknown>;
    const channel = obj['channel'];
    const type = obj['type'];

    // Validate required discriminator fields.
    if (typeof channel !== 'string') {
      return null;
    }

    // Cast through unknown for each branch — TypeScript narrows correctly
    // because of the channel + type checks.

    if (channel === 'lifecycle') {
      if (type === 'run_start' || type === 'run_end') {
        return {
          channel: 'lifecycle',
          type: type as 'run_start' | 'run_end',
          thread_id: String(obj['thread_id'] ?? ''),
        };
      }
    }

    if (channel === 'messages' && type === 'message_chunk') {
      return {
        channel: 'messages',
        type: 'message_chunk',
        content: String(obj['content'] ?? ''),
        run_id: String(obj['run_id'] ?? ''),
      };
    }

    if (channel === 'tools') {
      if (
        type === 'tool_start' ||
        type === 'tool_end' ||
        type === 'subagent_start' ||
        type === 'subagent_end'
      ) {
        const parentIds = Array.isArray(obj['parent_ids'])
          ? (obj['parent_ids'] as unknown[]).map(String)
          : [];

        if (type === 'tool_start') {
          return {
            channel: 'tools',
            type: 'tool_start',
            tool_call_id: String(obj['tool_call_id'] ?? ''),
            name: String(obj['name'] ?? ''),
            input: obj['input'],
            parent_ids: parentIds,
          };
        }
        if (type === 'tool_end') {
          return {
            channel: 'tools',
            type: 'tool_end',
            tool_call_id: String(obj['tool_call_id'] ?? ''),
            name: String(obj['name'] ?? ''),
            output: obj['output'],
            parent_ids: parentIds,
          };
        }
        if (type === 'subagent_start') {
          return {
            channel: 'tools',
            type: 'subagent_start',
            tool_call_id: String(obj['tool_call_id'] ?? ''),
            name: String(obj['name'] ?? ''),
            input: obj['input'],
            parent_ids: parentIds,
          };
        }
        if (type === 'subagent_end') {
          return {
            channel: 'tools',
            type: 'subagent_end',
            tool_call_id: String(obj['tool_call_id'] ?? ''),
            name: String(obj['name'] ?? ''),
            output: obj['output'],
            parent_ids: parentIds,
          };
        }
      }
    }

    if (channel === 'hitl' && type === 'hitl_interrupt') {
      const rawRequests = Array.isArray(obj['action_requests'])
        ? obj['action_requests']
        : [];
      return {
        channel: 'hitl',
        type: 'hitl_interrupt',
        action_requests: rawRequests.map((r: unknown) => {
          const req = (r ?? {}) as Record<string, unknown>;
          return {
            name: String(req['name'] ?? ''),
            args: (typeof req['args'] === 'object' && req['args'] !== null
              ? req['args']
              : {}) as Record<string, unknown>,
            description: String(req['description'] ?? ''),
            decisions: Array.isArray(req['decisions'])
              ? (req['decisions'] as unknown[]).map(String)
              : [],
          };
        }),
      };
    }

    if (channel === 'error') {
      if (type === 'error' || type === 'cancelled') {
        return {
          channel: 'error',
          type: type as 'error' | 'cancelled',
          message: String(obj['message'] ?? ''),
        };
      }
    }

    if (channel === 'heartbeat') {
      return {
        channel: 'heartbeat',
        type: '',
      };
    }

    if (channel === 'rubric') {
      if (type === 'rubric_evaluation_start') {
        return {
          channel: 'rubric',
          type: 'rubric_evaluation_start',
          iteration: typeof obj['iteration'] === 'number' ? obj['iteration'] : 0,
          grading_run_id: String(obj['grading_run_id'] ?? ''),
        };
      }
      if (type === 'rubric_evaluation_end') {
        return {
          channel: 'rubric',
          type: 'rubric_evaluation_end',
          iteration: typeof obj['iteration'] === 'number' ? obj['iteration'] : 0,
          result: String(obj['result'] ?? ''),
          explanation: String(obj['explanation'] ?? ''),
        };
      }
    }

    // Unknown event shape — caller should ignore.
    return null;
  }
}
